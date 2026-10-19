import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ProcurementPriority, PurchaseOrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsPositive,
  IsString, IsUUID, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { MAX_LINE_ITEMS } from '../procurement.constants';

export class PurchaseOrderItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) description!: string;
  @ApiPropertyOptional({ description: "Defaults to the order's category" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(20) unit!: string;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @IsPositive() quantity!: number;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) rate!: number;

  @ApiPropertyOptional({ description: 'GST %' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent?: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty() @IsUUID() projectId!: string;
  @ApiProperty() @IsUUID() vendorId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(60) category!: string;

  @ApiPropertyOptional({ enum: ProcurementPriority })
  @IsOptional()
  @IsEnum(ProcurementPriority)
  priority?: ProcurementPriority;

  @ApiProperty({ example: '2026-11-02' }) @IsISO8601({ strict: true }) expectedDelivery!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) deliveryAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;

  @ApiProperty({ type: [PurchaseOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one line item' })
  @ArrayMaxSize(MAX_LINE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items!: PurchaseOrderItemDto[];
}

export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {}

export class PurchaseOrderQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() vendorId?: string;

  @ApiPropertyOptional({ enum: PurchaseOrderStatus })
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;
}
