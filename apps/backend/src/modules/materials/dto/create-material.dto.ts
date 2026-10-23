import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min,
} from 'class-validator';

/** Selects send '' when nothing is picked; treat that as "no value" rather than an invalid id. */
export const emptyToNull = ({ value }: { value: unknown }): unknown => (value === '' ? null : value);

export class CreateMaterialDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sku!: string;

  @ApiProperty({ example: 'Bags' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  unit!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  maxStock?: number | null;

  @ApiPropertyOptional()
  @Transform(emptyToNull)
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional()
  @Transform(emptyToNull)
  @IsOptional()
  @IsUUID()
  supplierId?: string | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' } })
  @IsOptional()
  @IsObject()
  specifications?: Record<string, string>;
}
