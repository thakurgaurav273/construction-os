import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProcurementPriority } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsEnum, IsISO8601, IsInt, IsNotEmpty, IsNumber, IsOptional,
  IsPositive, IsString, IsUUID, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { MAX_LINE_ITEMS, MAX_NOTE_LENGTH, MAX_RFQ_VENDORS } from '../procurement.constants';

export class RfqItemDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) description!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(20) unit!: string;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @IsPositive() quantity!: number;
}

export class InviteVendorsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Invite at least one vendor' })
  @ArrayMaxSize(MAX_RFQ_VENDORS)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  vendorIds!: string[];
}

export class CreateRfqDto extends InviteVendorsDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiProperty() @IsUUID() projectId!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(60) category!: string;

  @ApiPropertyOptional({ enum: ProcurementPriority })
  @IsOptional()
  @IsEnum(ProcurementPriority)
  priority?: ProcurementPriority;

  @ApiProperty({ example: '2026-11-02' }) @IsISO8601({ strict: true }) closingDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedValue?: number;

  @ApiProperty({ type: [RfqItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one item to quote' })
  @ArrayMaxSize(MAX_LINE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => RfqItemDto)
  items!: RfqItemDto[];
}

export class QuoteItemDto {
  @ApiProperty() @IsUUID() rfqItemId!: string;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) rate!: number;
}

export class RecordQuoteDto {
  @ApiProperty({ description: 'Days from order to delivery' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  leadTimeDays!: number;

  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true }) validUntil?: string;

  @ApiProperty({ description: 'GST % applied to the quoted rates' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxPercent!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_NOTE_LENGTH) notes?: string;

  @ApiProperty({ type: [QuoteItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_LINE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items!: QuoteItemDto[];
}

export class AwardRfqDto {
  @ApiProperty() @IsUUID() invitationId!: string;
}
