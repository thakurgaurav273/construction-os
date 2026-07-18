import { IsString, IsNotEmpty, IsOptional, IsNumber, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  unitCost?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minStock?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxStock?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  warehouse?: string;

  @IsOptional()
  @IsObject()
  specifications?: Record<string, any>;
}
