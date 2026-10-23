import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsISO8601, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Max, MaxLength, Min,
} from 'class-validator';

/** Body of a material issue (store → site) or a return (site → store). */
export class SiteStockMovementDto {
  @ApiProperty()
  @IsUUID()
  materialId!: string;

  @ApiProperty({ description: 'Store the stock leaves from, or comes back to' })
  @IsUUID()
  warehouseId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Max(1_000_000_000)
  quantity!: number;

  @ApiPropertyOptional({ description: 'Defaults to today' })
  @IsOptional()
  @IsISO8601()
  issuedOn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class MaterialPlanDto {
  @ApiProperty({ description: 'Quantity the project expects to use, e.g. from the BOQ' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(1_000_000_000)
  planned!: number;
}
