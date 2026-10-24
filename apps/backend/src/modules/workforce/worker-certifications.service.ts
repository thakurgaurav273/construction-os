import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { normalizeOptionalText } from '../../common/utils/normalize-text';
import { dateKeyToDbDate, dbDateToKey } from './attendance-dates';
import { CreateCertificationDto, UpdateCertificationDto } from './dto/certification.dto';
import { WorkerDetailView } from './worker.mapper';
import { WorkforceService } from './workforce.service';

/** A worker's certificates. Changes return the whole worker so the drawer refreshes in one round trip. */
@Injectable()
export class WorkerCertificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workforce: WorkforceService,
  ) {}

  async add(workerId: string, organizationId: string, userId: string, dto: CreateCertificationDto): Promise<WorkerDetailView> {
    await this.findWorkerOrThrow(workerId, organizationId);
    const dates = toDates(dto.issuedOn ?? null, dto.expiresOn ?? null);
    await this.prisma.workerCertification.create({
      data: {
        workerId,
        organizationId,
        name: dto.name.trim(),
        issuer: normalizeOptionalText(dto.issuer) ?? null,
        certificateNumber: normalizeOptionalText(dto.certificateNumber) ?? null,
        ...dates,
        createdById: userId,
        updatedById: userId,
      },
    });
    return this.workforce.findOne(workerId, organizationId);
  }

  async update(
    workerId: string,
    certificationId: string,
    organizationId: string,
    userId: string,
    dto: UpdateCertificationDto,
  ): Promise<WorkerDetailView> {
    const existing = await this.findCertificationOrThrow(workerId, certificationId, organizationId);
    const issuedOn = dto.issuedOn === undefined ? keyOrNull(existing.issuedOn) : dto.issuedOn;
    const expiresOn = dto.expiresOn === undefined ? keyOrNull(existing.expiresOn) : dto.expiresOn;
    const dates = toDates(issuedOn, expiresOn);
    const expiryChanged = dates.expiresOn?.getTime() !== existing.expiresOn?.getTime();
    const data: Prisma.WorkerCertificationUpdateInput = {
      name: dto.name?.trim(),
      issuer: normalizeOptionalText(dto.issuer),
      certificateNumber: normalizeOptionalText(dto.certificateNumber),
      ...dates,
      // A new expiry date (a renewal) starts its reminders over.
      ...(expiryChanged && { remindedStage: null }),
      updatedById: userId,
    };
    await this.prisma.workerCertification.update({ where: { id: existing.id }, data });
    return this.workforce.findOne(workerId, organizationId);
  }

  async remove(workerId: string, certificationId: string, organizationId: string): Promise<WorkerDetailView> {
    const existing = await this.findCertificationOrThrow(workerId, certificationId, organizationId);
    await this.prisma.workerCertification.delete({ where: { id: existing.id } });
    return this.workforce.findOne(workerId, organizationId);
  }

  private async findWorkerOrThrow(workerId: string, organizationId: string): Promise<void> {
    const worker = await this.prisma.worker.findFirst({ where: { id: workerId, organizationId }, select: { id: true } });
    if (!worker) throw new NotFoundException('Worker not found.');
  }

  private async findCertificationOrThrow(workerId: string, certificationId: string, organizationId: string) {
    const certification = await this.prisma.workerCertification.findFirst({
      where: { id: certificationId, workerId, organizationId },
    });
    if (!certification) throw new NotFoundException('Certification not found.');
    return certification;
  }
}

function keyOrNull(date: Date | null): string | null {
  return date ? dbDateToKey(date) : null;
}

/** Calendar days in, @db.Date values out; a certificate can't expire before it was issued. */
function toDates(issuedOn: string | null, expiresOn: string | null): { issuedOn: Date | null; expiresOn: Date | null } {
  const issued = issuedOn ? issuedOn.slice(0, 10) : null;
  const expires = expiresOn ? expiresOn.slice(0, 10) : null;
  if (issued && expires && expires < issued) {
    throw new BadRequestException('The expiry date must be on or after the issue date.');
  }
  return { issuedOn: issued ? dateKeyToDbDate(issued) : null, expiresOn: expires ? dateKeyToDbDate(expires) : null };
}
