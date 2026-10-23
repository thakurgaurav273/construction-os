import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { normalizeOptionalText } from '../../common/utils/normalize-text';
import {
  CreateLocationDto, CreateWarehouseDto, UpdateLocationDto, UpdateWarehouseDto,
} from './dto/warehouse.dto';
import { num } from './inventory.helpers';

export interface LocationView {
  id: string;
  code: string;
  name: string;
  zone: string | null;
}

/** Setting up stores and their bin locations. Stock itself only changes through the stock ledger. */
@Injectable()
export class WarehouseSetupService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateWarehouseDto): Promise<{ id: string }> {
    await this.assertProject(organizationId, dto.projectId);
    try {
      return await this.prisma.warehouse.create({
        data: {
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
          type: dto.type,
          address: normalizeOptionalText(dto.address),
          city: normalizeOptionalText(dto.city),
          manager: normalizeOptionalText(dto.manager),
          capacity: dto.capacity,
          projectId: dto.projectId ?? null,
          organizationId,
        },
        select: { id: true },
      });
    } catch (error) {
      throw toCodeConflict(error, 'store', dto.code);
    }
  }

  async update(id: string, organizationId: string, dto: UpdateWarehouseDto): Promise<{ id: string }> {
    await this.findWarehouse(id, organizationId);
    await this.assertProject(organizationId, dto.projectId);
    try {
      return await this.prisma.warehouse.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          code: dto.code?.trim().toUpperCase(),
          type: dto.type,
          address: normalizeOptionalText(dto.address),
          city: normalizeOptionalText(dto.city),
          manager: normalizeOptionalText(dto.manager),
          capacity: dto.capacity,
          projectId: dto.projectId,
        },
        select: { id: true },
      });
    } catch (error) {
      throw toCodeConflict(error, 'store', dto.code ?? '');
    }
  }

  /** Only an empty store with no open transfers or deliveries can be archived; its history is kept. */
  async archive(id: string, organizationId: string): Promise<{ id: string }> {
    const warehouse = await this.findWarehouse(id, organizationId);
    const [stock, openTransfers, openDeliveries] = await Promise.all([
      this.prisma.inventoryItem.aggregate({ where: { warehouseId: id }, _sum: { quantity: true } }),
      this.prisma.stockTransfer.count({
        where: {
          organizationId,
          status: { in: ['PENDING', 'APPROVED', 'IN_TRANSIT'] },
          OR: [{ fromWarehouseId: id }, { toWarehouseId: id }],
        },
      }),
      this.prisma.delivery.count({ where: { warehouseId: id, status: { in: ['SCHEDULED', 'IN_TRANSIT'] } } }),
    ]);
    if (num(stock._sum.quantity) > 0) {
      throw new BadRequestException(`${warehouse.name} still holds stock. Transfer or adjust it to zero first.`);
    }
    if (openTransfers > 0 || openDeliveries > 0) {
      throw new BadRequestException(`${warehouse.name} has open transfers or deliveries. Finish or cancel them first.`);
    }
    await this.prisma.warehouse.update({ where: { id }, data: { deletedAt: new Date() } });
    return { id };
  }

  async createLocation(warehouseId: string, organizationId: string, dto: CreateLocationDto): Promise<LocationView> {
    await this.findWarehouse(warehouseId, organizationId);
    try {
      return await this.prisma.warehouseLocation.create({
        data: {
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          zone: normalizeOptionalText(dto.zone),
          warehouseId,
          organizationId,
        },
        select: { id: true, code: true, name: true, zone: true },
      });
    } catch (error) {
      throw toCodeConflict(error, 'bin', dto.code);
    }
  }

  async updateLocation(
    warehouseId: string,
    locationId: string,
    organizationId: string,
    dto: UpdateLocationDto,
  ): Promise<LocationView> {
    await this.findLocation(warehouseId, locationId, organizationId);
    try {
      return await this.prisma.warehouseLocation.update({
        where: { id: locationId },
        data: { code: dto.code?.trim().toUpperCase(), name: dto.name?.trim(), zone: normalizeOptionalText(dto.zone) },
        select: { id: true, code: true, name: true, zone: true },
      });
    } catch (error) {
      throw toCodeConflict(error, 'bin', dto.code ?? '');
    }
  }

  /** Items stored in the bin keep their stock; they just lose the bin assignment. */
  async removeLocation(warehouseId: string, locationId: string, organizationId: string): Promise<{ id: string }> {
    await this.findLocation(warehouseId, locationId, organizationId);
    await this.prisma.$transaction([
      this.prisma.inventoryItem.updateMany({ where: { locationId }, data: { locationId: null } }),
      this.prisma.warehouseLocation.delete({ where: { id: locationId } }),
    ]);
    return { id: locationId };
  }

  private async findWarehouse(id: string, organizationId: string): Promise<{ id: string; name: string }> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!warehouse) throw new NotFoundException('Store not found');
    return warehouse;
  }

  private async findLocation(warehouseId: string, locationId: string, organizationId: string): Promise<void> {
    await this.findWarehouse(warehouseId, organizationId);
    const location = await this.prisma.warehouseLocation.findFirst({
      where: { id: locationId, warehouseId, organizationId },
      select: { id: true },
    });
    if (!location) throw new NotFoundException('Bin location not found');
  }

  private async assertProject(organizationId: string, projectId: string | null | undefined): Promise<void> {
    if (!projectId) return;
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!project) throw new BadRequestException('Choose a project from your organization.');
  }
}

function toCodeConflict(error: unknown, kind: 'store' | 'bin', code: string): unknown {
  const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  if (!isDuplicate) return error;
  return new ConflictException(
    kind === 'store'
      ? `Store code ${code.trim().toUpperCase()} is already in use, including by archived stores.`
      : `Bin ${code.trim().toUpperCase()} already exists in this store.`,
  );
}
