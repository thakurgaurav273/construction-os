import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { normalizeOptionalText } from '../../common/utils/normalize-text';
import { nextDocumentNumber, withDocumentNumberRetry } from '../procurement/document-numbers';
import { addUtcDays, startOfUtcDay } from '../procurement/procurement-math';
import { findOpenProject } from '../projects/project-guards';
import type { Paginated } from '../projects/projects.service';
import { CreateMaterialRequestDto, MaterialRequestQueryDto } from './dto/material-request.dto';
import {
  MATERIAL_REQUEST_INCLUDE, MaterialRequestDetailView, MaterialRequestView, OPEN_REQUEST_STATUSES,
  toMaterialRequestDetailView, toMaterialRequestView,
} from './material-request.mapper';
import { MATERIAL_ISSUE_INCLUDE } from './project-materials.mapper';

const REQUEST_PREFIX = 'MRQ';

/**
 * Material requests: a site asks the stores for material instead of waiting on whoever holds the keys.
 * Raising one moves no stock; the workflow service approves, issues and closes it.
 */
@Injectable()
export class MaterialRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: MaterialRequestQueryDto): Promise<Paginated<MaterialRequestView>> {
    const where: Prisma.MaterialRequestWhereInput = { organizationId };
    if (query.status === 'OPEN') where.status = { in: OPEN_REQUEST_STATUSES };
    else if (query.status) where.status = query.status;
    if (query.projectId) where.projectId = query.projectId;
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { items: { some: { material: { name: { contains: query.search, mode: 'insensitive' } } } } },
      ];
    }

    const { page, limit } = query;
    const [rows, total] = await Promise.all([
      this.prisma.materialRequest.findMany({
        where,
        include: MATERIAL_REQUEST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.materialRequest.count({ where }),
    ]);
    return { items: rows.map(toMaterialRequestView), total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async findOne(id: string, organizationId: string): Promise<MaterialRequestDetailView> {
    const request = await this.prisma.materialRequest.findFirst({
      where: { id, organizationId },
      include: MATERIAL_REQUEST_INCLUDE,
    });
    if (!request) throw new NotFoundException('Material request not found.');
    const issues = await this.prisma.materialIssue.findMany({
      where: { organizationId, requestItem: { requestId: id } },
      include: MATERIAL_ISSUE_INCLUDE,
      orderBy: [{ issuedOn: 'desc' }, { createdAt: 'desc' }],
    });
    return toMaterialRequestDetailView(request, issues);
  }

  async create(organizationId: string, userId: string, dto: CreateMaterialRequestDto): Promise<MaterialRequestDetailView> {
    const project = await findOpenProject(this.prisma, dto.projectId, organizationId, 'request material for it');

    const materialIds = dto.items.map((item) => item.materialId);
    if (new Set(materialIds).size !== materialIds.length) {
      throw new BadRequestException('Each material can appear only once in a request. Add the quantities together.');
    }
    const materials = await this.prisma.material.findMany({
      where: { id: { in: materialIds }, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (materials.length !== materialIds.length) throw new NotFoundException('One of the materials was not found or is archived.');

    const neededBy = dto.neededBy ? startOfUtcDay(new Date(dto.neededBy)) : null;
    // A day of slack so a site a few time zones behind UTC can still pick "today".
    if (neededBy && neededBy < addUtcDays(new Date(), -1)) throw new BadRequestException("The needed-by date can't be in the past.");
    const note = normalizeOptionalText(dto.note) ?? null;

    const request = await withDocumentNumberRetry(() => this.prisma.$transaction(async (tx) => {
      const existing = await tx.materialRequest.findMany({
        where: { organizationId, code: { startsWith: `${REQUEST_PREFIX}-` } },
        select: { code: true },
      });
      const created = await tx.materialRequest.create({
        data: {
          code: nextDocumentNumber(REQUEST_PREFIX, existing.map((row) => row.code)),
          neededBy,
          note,
          projectId: project.id,
          requestedById: userId,
          organizationId,
          items: { create: dto.items.map((item) => ({ materialId: item.materialId, quantity: item.quantity, organizationId })) },
        },
        select: { id: true, code: true },
      });
      await tx.activity.create({
        data: {
          type: 'update',
          title: 'Material requested',
          description: `${created.code}: ${dto.items.length === 1 ? '1 material' : `${dto.items.length} materials`} requested from the stores.`,
          entityType: 'material_request',
          entityId: created.id,
          metadata: { code: created.code },
          actorId: userId,
          projectId: project.id,
          organizationId,
        },
      });
      return created;
    }));
    return this.findOne(request.id, organizationId);
  }
}
