import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectPriority, ProjectStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/** `sort` accepts createdAt, name, code, progress, expectedCompletion or budget; anything else sorts by newest. */
export class ProjectQueryDto extends PaginationDto {
  /** Archived projects are hidden unless asked for explicitly. */
  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ enum: ProjectPriority })
  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;
}
