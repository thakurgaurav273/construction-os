import {
  Controller, Get, Post, Delete, Param, UploadedFile,
  UseGuards, UseInterceptors, Res, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';

interface AuthUser { id: string; organizationId: string; role: string }

@Controller('projects/:projectId/documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  findAll(@Param('projectId') projectId: string, @CurrentUser() user: AuthUser) {
    return this.service.findAll(projectId, user.organizationId);
  }

  @RequirePermission('document.upload')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.upload(projectId, user.organizationId, user.id, file);
  }

  @Get(':documentId/download')
  async download(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.getDownloadUrl(documentId, user.organizationId);
  }

  @RequirePermission('document.delete')
  @Delete(':documentId')
  remove(
    @Param('projectId') projectId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(documentId, user.organizationId);
  }
}
