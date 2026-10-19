import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min,
  ValidateNested,
} from 'class-validator';
import { MAX_LINE_ITEMS, MAX_NOTE_LENGTH } from '../procurement.constants';

export class ScheduleDeliveryDto {
  @ApiProperty({ example: '2026-11-02' }) @IsISO8601({ strict: true }) scheduledDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) trackingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_NOTE_LENGTH) notes?: string;
}

export class ReceivedItemDto {
  @ApiProperty() @IsUUID() poLineItemId!: string;

  @ApiPropertyOptional({ description: 'Links an unlinked PO line to a catalogue material so the receipt is posted to stock' })
  @IsOptional()
  @IsUUID()
  materialId?: string;

  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) quantity!: number;
}

export class ReceiveGoodsDto {
  @ApiPropertyOptional({ description: 'Scheduled delivery being received; omit for an unscheduled arrival' })
  @IsOptional()
  @IsUUID()
  deliveryId?: string;

  @ApiPropertyOptional({ description: "Store receiving stocked materials; defaults to the project's site store" })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ description: 'Defaults to now' }) @IsOptional() @IsISO8601() receivedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) trackingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_NOTE_LENGTH) notes?: string;

  @ApiProperty({ type: [ReceivedItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_LINE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => ReceivedItemDto)
  items!: ReceivedItemDto[];
}

export class DeliveryQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() purchaseOrderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
}
