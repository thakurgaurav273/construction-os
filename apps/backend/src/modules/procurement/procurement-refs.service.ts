import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

function num(d: Prisma.Decimal | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === 'number' ? d : Number(d);
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function str(value: string | null | undefined): string {
  return value ?? '';
}

@Injectable()
export class ProcurementRefsService {
  constructor(private readonly prisma: PrismaService) {}

  async findVendors(organizationId: string) {
    const vendors = await this.prisma.vendor.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
    return vendors.map((v) => ({
      id: v.id,
      name: v.name,
      code: v.code,
      categories: v.categories,
      status: v.status,
      rating: v.rating,
      performanceScore: v.performanceScore,
      onTimeDeliveryPercent: v.onTimeDeliveryPercent,
      deliveryAccuracy: v.deliveryAccuracy,
      qualityRating: v.qualityRating,
      responseTimeHours: v.responseTimeHours,
      projectCount: v.projectCount,
      totalOrders: v.totalOrders,
      outstandingBalance: num(v.outstandingBalance),
      lastOrderDate: iso(v.lastOrderDate),
      contactPerson: str(v.contactPerson),
      phone: str(v.phone),
      email: str(v.email),
      gstNumber: str(v.gstNumber),
      paymentTerms: str(v.paymentTerms),
      city: str(v.city),
      state: str(v.state),
      aiRecommendation: str(v.aiRecommendation),
    }));
  }

  async findRfqs(organizationId: string) {
    const rfqs = await this.prisma.rfq.findMany({
      where: { organizationId },
      include: { project: { select: { name: true } } },
      orderBy: { issuedDate: 'desc' },
    });
    return rfqs.map((r) => ({
      id: r.id,
      rfqNumber: r.rfqNumber,
      projectId: r.projectId ?? '',
      projectName: r.project?.name ?? '',
      title: r.title,
      category: r.category,
      vendorsInvited: r.vendorsInvited,
      responsesReceived: r.responsesReceived,
      issuedDate: iso(r.issuedDate),
      closingDate: iso(r.closingDate),
      status: r.status,
      priority: r.priority,
      estimatedValue: num(r.estimatedValue),
      createdBy: r.createdBy,
    }));
  }

  async findDeliveries(organizationId: string) {
    const deliveries = await this.prisma.delivery.findMany({
      where: { organizationId },
      orderBy: { scheduledDate: 'desc' },
    });
    return deliveries.map((d) => ({
      id: d.id,
      poNumber: d.poNumber,
      vendorName: d.vendorName,
      projectName: d.projectName,
      category: d.category,
      status: d.status,
      scheduledDate: iso(d.scheduledDate),
      actualDate: iso(d.actualDate),
      itemSummary: d.itemSummary,
      delayDays: d.delayDays,
      trackingId: d.trackingId,
    }));
  }
}
