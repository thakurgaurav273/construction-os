import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class AuditLogQueryDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() actorId?: string;
  @ApiPropertyOptional({ example: 'purchase_order' }) @IsOptional() @IsString() @MaxLength(60) entityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) entityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional({ description: 'Exact action or a prefix such as "purchase_order."' }) @IsOptional() @IsString() @MaxLength(80) action?: string;
  @ApiPropertyOptional({ description: 'ISO date, inclusive' }) @IsOptional() @IsISO8601() from?: string;
  @ApiPropertyOptional({ description: 'ISO date, inclusive' }) @IsOptional() @IsISO8601() to?: string;
}
