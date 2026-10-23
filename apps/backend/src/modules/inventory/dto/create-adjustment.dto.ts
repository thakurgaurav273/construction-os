import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

const ADJUSTMENT_REASONS = ['CYCLE_COUNT', 'DAMAGE', 'LOSS', 'FOUND', 'CORRECTION', 'RETURN'] as const;

export class CreateAdjustmentDto {
  @ApiProperty() @IsUUID() warehouseId!: string;
  @ApiProperty() @IsUUID() materialId!: string;

  @ApiProperty({ enum: ADJUSTMENT_REASONS })
  @IsIn([...ADJUSTMENT_REASONS])
  reason!: string;

  @ApiProperty({ description: 'The counted on-hand quantity after the adjustment' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(1_000_000_000)
  quantityAfter!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) note?: string;
}
