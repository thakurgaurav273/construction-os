import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

/**
 * Store-level settings only. Quantities, damaged and incoming stock change through receipts, issues,
 * transfers and adjustments.
 */
export class UpdateInventoryItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(1_000_000_000)
  reorderLevel?: number;

  @ApiPropertyOptional({ nullable: true, description: 'Bin location in the same store; null clears it' })
  @Transform(({ value }: { value: unknown }) => (value === '' ? null : value))
  @IsOptional()
  @IsUUID()
  locationId?: string | null;
}
