import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class MovementQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  materialId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ enum: ['INBOUND', 'OUTBOUND', 'TRANSFER', 'CONSUMPTION', 'ADJUSTMENT'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'ISO date' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'ISO date' })
  @IsOptional()
  @IsString()
  dateTo?: string;
}
