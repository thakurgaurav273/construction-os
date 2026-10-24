import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PermissionsGuard, RequirePermission } from '../../common/permissions';
import { Audit } from '../../common/audit';
import { CreateCertificationDto, UpdateCertificationDto } from './dto/certification.dto';
import { WorkerDetailView } from './worker.mapper';
import { WorkerCertificationsService } from './worker-certifications.service';

interface AuthUser { id: string; organizationId: string }

@Controller('workforce/:workerId/certifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkerCertificationsController {
  constructor(private readonly certifications: WorkerCertificationsService) {}

  @RequirePermission('workforce.manage')
  @Audit('worker.certification_added', { idParam: 'workerId' })
  @Post()
  add(@Param('workerId') workerId: string, @Body() dto: CreateCertificationDto, @CurrentUser() user: AuthUser): Promise<WorkerDetailView> {
    return this.certifications.add(workerId, user.organizationId, user.id, dto);
  }

  @RequirePermission('workforce.manage')
  @Audit('worker.certification_updated', { idParam: 'workerId' })
  @Patch(':certificationId')
  update(
    @Param('workerId') workerId: string,
    @Param('certificationId') certificationId: string,
    @Body() dto: UpdateCertificationDto,
    @CurrentUser() user: AuthUser,
  ): Promise<WorkerDetailView> {
    return this.certifications.update(workerId, certificationId, user.organizationId, user.id, dto);
  }

  @RequirePermission('workforce.manage')
  @Audit('worker.certification_removed', { idParam: 'workerId' })
  @Delete(':certificationId')
  remove(
    @Param('workerId') workerId: string,
    @Param('certificationId') certificationId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<WorkerDetailView> {
    return this.certifications.remove(workerId, certificationId, user.organizationId);
  }
}
