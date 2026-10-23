import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ImportEntity, ImportTemplate, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SaveImportTemplateDto, UpdateImportTemplateDto } from './dto/data-import.dto';
import { IMPORT_DEFINITIONS } from './import-definitions';
import { ImportMapping, missingRequiredFields, sanitizeMapping } from './import-mapping';
import { headerSignature, headingsAt } from './sheet-reader';

export interface ImportTemplateView {
  id: string;
  name: string;
  entity: ImportEntity;
  headerRow: number;
  headers: string[];
  mapping: ImportMapping;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toView(template: ImportTemplate): ImportTemplateView {
  return {
    id: template.id,
    name: template.name,
    entity: template.entity,
    headerRow: template.headerRow,
    headers: template.headers,
    mapping: sanitizeMapping(template.mapping, IMPORT_DEFINITIONS[template.entity], template.headers),
    lastUsedAt: template.lastUsedAt,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

/** Rejects a mapping that would leave required fields empty on every row. */
function checkedMapping(entity: ImportEntity, headers: string[], raw: unknown): ImportMapping {
  const definition = IMPORT_DEFINITIONS[entity];
  const mapping = sanitizeMapping(raw, definition, headers);
  const missing = missingRequiredFields(definition, mapping);
  if (missing.length > 0) {
    throw new BadRequestException(`Choose a column or a fixed value for: ${missing.map((field) => field.label).join(', ')}.`);
  }
  return mapping;
}

function toNameConflict(error: unknown, name: string): unknown {
  const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  return isDuplicate ? new ConflictException(`A template named “${name.trim()}” already exists. Pick another name.`) : error;
}

/** An organization's saved sheet layouts: the memory that lets the next upload skip mapping entirely. */
@Injectable()
export class ImportTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, entity?: ImportEntity): Promise<ImportTemplateView[]> {
    const templates = await this.prisma.importTemplate.findMany({
      where: { organizationId, entity },
      orderBy: [{ entity: 'asc' }, { name: 'asc' }],
    });
    return templates.map(toView);
  }

  async findOne(id: string, organizationId: string): Promise<ImportTemplateView> {
    const template = await this.prisma.importTemplate.findFirst({ where: { id, organizationId } });
    if (!template) throw new NotFoundException('Import template not found.');
    return toView(template);
  }

  /** The saved layout whose headings sit at its header row in this sheet, most recently used first. */
  async findMatching(organizationId: string, entity: ImportEntity, rows: string[][]): Promise<ImportTemplateView | null> {
    const templates = await this.prisma.importTemplate.findMany({
      where: { organizationId, entity },
      orderBy: [{ lastUsedAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }],
    });
    const match = templates.find((template) => headerSignature(headingsAt(rows, template.headerRow)) === template.headerSignature);
    return match ? toView(match) : null;
  }

  async create(organizationId: string, userId: string, dto: SaveImportTemplateDto): Promise<ImportTemplateView> {
    const mapping = checkedMapping(dto.entity, dto.headers, dto.mapping);
    try {
      const template = await this.prisma.importTemplate.create({
        data: {
          name: dto.name.trim(),
          entity: dto.entity,
          headerRow: dto.headerRow,
          headers: dto.headers,
          headerSignature: headerSignature(dto.headers),
          mapping,
          organizationId,
          createdById: userId,
          updatedById: userId,
        },
      });
      return toView(template);
    } catch (error) {
      throw toNameConflict(error, dto.name);
    }
  }

  async update(id: string, organizationId: string, userId: string, dto: UpdateImportTemplateDto): Promise<ImportTemplateView> {
    const existing = await this.findOne(id, organizationId);
    const mapping = checkedMapping(existing.entity, dto.headers, dto.mapping);
    try {
      const template = await this.prisma.importTemplate.update({
        where: { id },
        data: {
          name: dto.name.trim(),
          headerRow: dto.headerRow,
          headers: dto.headers,
          headerSignature: headerSignature(dto.headers),
          mapping,
          updatedById: userId,
        },
      });
      return toView(template);
    } catch (error) {
      throw toNameConflict(error, dto.name);
    }
  }

  async remove(id: string, organizationId: string): Promise<{ id: string }> {
    await this.findOne(id, organizationId);
    await this.prisma.importTemplate.delete({ where: { id } });
    return { id };
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.importTemplate.update({ where: { id }, data: { lastUsedAt: new Date() } });
  }
}
