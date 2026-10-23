import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ReorderQueryDto {
  @ApiProperty() @IsUUID() materialId!: string;
  @ApiPropertyOptional({ description: 'Plan the reorder for one store instead of the whole organization' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}
