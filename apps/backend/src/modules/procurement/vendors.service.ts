import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Vendor, VendorStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { normalizeOptionalText } from '../../common/utils/normalize-text';
import { nextDocumentNumber, withDocumentNumberRetry } from './document-numbers';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { DOCUMENT_PREFIX } from './procurement.constants';
import { roundMoney, toNumber, wholeDaysBetween } from './procurement-math';
import { EMPTY_VENDOR_STATS, VendorStats, VendorView, toVendorView } from './vendor.mapper';

interface VendorAccumulator {
  totalOrders: number;
  projects: Set<string>;
  totalSpend: number;
  lastOrderDate: Date | null;
  deliveriesReceived: number;
  onTimeDeliveries: number;
  outstandingBalance: number;
}

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string): Promise<VendorView[]> {
    const [vendors, stats] = await Promise.all([
      this.prisma.vendor.findMany({ where: { organizationId }, orderBy: { name: 'asc' } }),
      this.computeStats(organizationId),
    ]);
    return vendors.map((vendor) => toVendorView(vendor, stats.get(vendor.id) ?? EMPTY_VENDOR_STATS));
  }

  async findOne(id: string, organizationId: string): Promise<VendorView> {
    const vendor = await this.findVendorOrThrow(id, organizationId);
    const stats = await this.computeStats(organizationId, id);
    return toVendorView(vendor, stats.get(id) ?? EMPTY_VENDOR_STATS);
  }

  async create(organizationId: string, dto: CreateVendorDto): Promise<VendorView> {
    const requestedCode = dto.code?.trim().toUpperCase();
    if (requestedCode) await this.assertCodeAvailable(requestedCode, organizationId);

    const vendor = await withDocumentNumberRetry(async () => {
      const code = requestedCode || (await this.nextVendorCode(organizationId));
      return this.prisma.vendor.create({
        data: { ...toVendorData(dto), name: dto.name.trim(), code, organizationId },
      });
    });
    return this.findOne(vendor.id, organizationId);
  }

  async update(id: string, organizationId: string, dto: UpdateVendorDto): Promise<VendorView> {
    const existing = await this.findVendorOrThrow(id, organizationId);
    const code = dto.code?.trim().toUpperCase();
    if (code && code !== existing.code) await this.assertCodeAvailable(code, organizationId);

    await this.prisma.vendor.update({
      where: { id },
      data: { ...toVendorData(dto), name: dto.name?.trim(), code: code || undefined },
    });
    return this.findOne(id, organizationId);
  }

  /** Inactive vendors keep their order history but can't receive new orders or RFQ invitations. */
  async setStatus(id: string, organizationId: string, status: VendorStatus): Promise<VendorView> {
    await this.findVendorOrThrow(id, organizationId);
    await this.prisma.vendor.update({ where: { id }, data: { status } });
    return this.findOne(id, organizationId);
  }

  async findActiveVendors(ids: string[], organizationId: string): Promise<Vendor[]> {
    const vendors = await this.prisma.vendor.findMany({ where: { id: { in: ids }, organizationId } });
    if (vendors.length !== new Set(ids).size) throw new NotFoundException('Vendor not found.');

    const inactive = vendors.filter((vendor) => vendor.status !== 'ACTIVE');
    if (inactive.length > 0) {
      const names = inactive.map((vendor) => vendor.name).join(', ');
      throw new BadRequestException(`${names} ${inactive.length === 1 ? 'is' : 'are'} inactive. Reactivate before ordering.`);
    }
    return vendors;
  }

  async findActiveVendor(id: string, organizationId: string): Promise<Vendor> {
    const [vendor] = await this.findActiveVendors([id], organizationId);
    return vendor;
  }

  private async computeStats(organizationId: string, vendorId?: string): Promise<Map<string, VendorStats>> {
    const [orders, receipts, payableInvoices] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: { organizationId, status: 'APPROVED', vendorId: vendorId ?? { not: null } },
        select: { vendorId: true, projectId: true, amount: true, requestedDate: true },
      }),
      this.prisma.delivery.findMany({
        where: { organizationId, status: 'RECEIVED', purchaseOrder: { vendorId: vendorId ?? { not: null } } },
        select: { scheduledDate: true, receivedAt: true, purchaseOrder: { select: { vendorId: true } } },
      }),
      // Approved bills still owing money; mirrors PAYABLE_INVOICE_STATUSES in the finance module.
      this.prisma.invoice.findMany({
        where: { organizationId, status: { in: ['APPROVED', 'PARTIALLY_PAID'] }, vendorId: vendorId ?? { not: null } },
        select: { vendorId: true, totalAmount: true, payments: { where: { status: 'PAID' }, select: { amount: true } } },
      }),
    ]);

    const accumulators = new Map<string, VendorAccumulator>();
    const accumulatorFor = (id: string): VendorAccumulator => {
      const existing = accumulators.get(id);
      if (existing) return existing;
      const created: VendorAccumulator = {
        totalOrders: 0, projects: new Set(), totalSpend: 0, lastOrderDate: null, deliveriesReceived: 0, onTimeDeliveries: 0,
        outstandingBalance: 0,
      };
      accumulators.set(id, created);
      return created;
    };

    for (const order of orders) {
      if (!order.vendorId) continue;
      const stats = accumulatorFor(order.vendorId);
      stats.totalOrders += 1;
      stats.totalSpend += toNumber(order.amount);
      if (order.projectId) stats.projects.add(order.projectId);
      if (!stats.lastOrderDate || order.requestedDate > stats.lastOrderDate) stats.lastOrderDate = order.requestedDate;
    }

    for (const receipt of receipts) {
      if (!receipt.purchaseOrder.vendorId || !receipt.receivedAt) continue;
      const stats = accumulatorFor(receipt.purchaseOrder.vendorId);
      stats.deliveriesReceived += 1;
      if (wholeDaysBetween(receipt.scheduledDate, receipt.receivedAt) <= 0) stats.onTimeDeliveries += 1;
    }

    for (const invoice of payableInvoices) {
      if (!invoice.vendorId) continue;
      const paid = invoice.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
      accumulatorFor(invoice.vendorId).outstandingBalance += Math.max(0, toNumber(invoice.totalAmount) - paid);
    }

    return new Map([...accumulators].map(([id, stats]) => [id, {
      totalOrders: stats.totalOrders,
      projectCount: stats.projects.size,
      totalSpend: roundMoney(stats.totalSpend),
      lastOrderDate: stats.lastOrderDate,
      deliveriesReceived: stats.deliveriesReceived,
      onTimeDeliveryPercent: stats.deliveriesReceived
        ? Math.round((stats.onTimeDeliveries / stats.deliveriesReceived) * 100)
        : null,
      outstandingBalance: roundMoney(stats.outstandingBalance),
    }]));
  }

  private async findVendorOrThrow(id: string, organizationId: string): Promise<Vendor> {
    const vendor = await this.prisma.vendor.findFirst({ where: { id, organizationId } });
    if (!vendor) throw new NotFoundException('Vendor not found.');
    return vendor;
  }

  private async assertCodeAvailable(code: string, organizationId: string): Promise<void> {
    const clash = await this.prisma.vendor.findFirst({ where: { code, organizationId }, select: { id: true } });
    if (clash) throw new ConflictException(`Vendor code ${code} is already in use.`);
  }

  private async nextVendorCode(organizationId: string): Promise<string> {
    const vendors = await this.prisma.vendor.findMany({
      where: { organizationId, code: { startsWith: `${DOCUMENT_PREFIX.vendor}-` } },
      select: { code: true },
    });
    return nextDocumentNumber(DOCUMENT_PREFIX.vendor, vendors.map((vendor) => vendor.code));
  }
}

interface VendorData {
  categories?: string[];
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  gstNumber?: string | null;
  paymentTerms?: string | null;
  city?: string | null;
  state?: string | null;
}

function toVendorData(dto: UpdateVendorDto): VendorData {
  const email = normalizeOptionalText(dto.email);
  const gstNumber = normalizeOptionalText(dto.gstNumber);
  return {
    categories: dto.categories ? [...new Set(dto.categories.map((category) => category.trim()).filter(Boolean))] : undefined,
    contactPerson: normalizeOptionalText(dto.contactPerson),
    phone: normalizeOptionalText(dto.phone),
    email: email ? email.toLowerCase() : email,
    gstNumber: gstNumber ? gstNumber.toUpperCase() : gstNumber,
    paymentTerms: normalizeOptionalText(dto.paymentTerms),
    city: normalizeOptionalText(dto.city),
    state: normalizeOptionalText(dto.state),
  };
}
