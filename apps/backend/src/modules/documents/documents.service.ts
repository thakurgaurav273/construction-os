import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findAll(projectId: string, organizationId: string) {
    return this.prisma.document.findMany({
      where: { projectId, organizationId },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(
    projectId: string,
    organizationId: string,
    userId: string,
    file: Express.Multer.File,
    options: { dailyReportId?: string } = {},
  ) {
    const key = `organizations/${organizationId}/projects/${projectId}/documents/${uuidv4()}-${file.originalname}`;
    const url = await this.storage.upload(key, file.buffer, file.mimetype);

    return this.prisma.document.create({
      data: {
        name: file.originalname,
        type: this.getType(file.mimetype),
        mimeType: file.mimetype,
        size: file.size,
        url,
        storageKey: key,
        entityType: options.dailyReportId ? 'daily_report' : 'project',
        entityId: options.dailyReportId ?? projectId,
        dailyReportId: options.dailyReportId,
        projectId,
        organizationId,
        uploadedById: userId,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
  }

  async getDownloadUrl(documentId: string, organizationId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, organizationId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    const url = await this.storage.getSignedDownloadUrl(doc.storageKey);
    return { url };
  }

  async remove(documentId: string, organizationId: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, organizationId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    await this.storage.delete(doc.storageKey);
    await this.prisma.document.delete({ where: { id: documentId } });
    return { success: true };
  }

  private getType(mimeType: string): string {
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
    return 'file';
  }
}
