import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class MaterialQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCKED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: "Pass 'true' to only return low/out-of-stock materials" })
  @IsOptional()
  @IsString()
  lowStock?: string;
}
