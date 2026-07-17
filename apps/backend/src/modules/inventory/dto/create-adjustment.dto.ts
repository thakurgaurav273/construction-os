import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const ADJUSTMENT_REASONS = ['CYCLE_COUNT', 'DAMAGE', 'LOSS', 'FOUND', 'CORRECTION', 'RETURN'] as const;

export class CreateAdjustmentDto {
  @ApiProperty() @IsString() warehouseId!: string;
  @ApiProperty() @IsString() materialId!: string;
  @ApiProperty({ enum: ADJUSTMENT_REASONS })
  @IsIn(ADJUSTMENT_REASONS as unknown as string[])
  reason!: string;
  @ApiProperty({ description: 'The corrected on-hand quantity after the adjustment' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantityAfter!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() adjustedBy?: string;
}
