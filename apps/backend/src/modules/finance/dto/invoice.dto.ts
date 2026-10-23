import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString,
  IsUUID, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { MAX_INVOICE_LINES } from '../finance.constants';

export class InvoiceItemDto {
  @ApiPropertyOptional({ description: 'PO line being billed; enables the 3-way match' })
  @IsOptional()
  @IsUUID()
  poLineItemId?: string;

  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) description!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(20) unit!: string;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @IsPositive() quantity!: number;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) rate!: number;

  @ApiProperty({ description: 'GST %' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxPercent!: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ description: "The vendor's bill number" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  invoiceNumber!: string;

  @ApiProperty() @IsUUID() vendorId!: string;

  @ApiPropertyOptional({ description: 'Required unless the bill is against a purchase order' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() purchaseOrderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) category?: string;
  @ApiProperty({ example: '2026-10-19' }) @IsISO8601({ strict: true }) issuedDate!: string;
  @ApiProperty({ example: '2026-11-18' }) @IsISO8601({ strict: true }) dueDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one line to the invoice' })
  @ArrayMaxSize(MAX_INVOICE_LINES)
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items!: InvoiceItemDto[];
}

export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {}

export class InvoiceQueryDto {
  @ApiPropertyOptional({ enum: InvoiceStatus }) @IsOptional() @IsEnum(InvoiceStatus) status?: InvoiceStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() vendorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() purchaseOrderId?: string;
}

export class BillableLinesQueryDto {
  @ApiProperty() @IsUUID() purchaseOrderId!: string;
}
