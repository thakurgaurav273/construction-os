import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { PAYMENT_METHODS } from '../../finance/finance.constants';
import { MAX_NOTE_LENGTH } from '../billing.constants';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class RecordReceiptDto {
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive({ message: 'Enter the amount received' }) amount!: number;
  @ApiProperty({ example: '2026-11-15' }) @IsISO8601({ strict: true }) receivedDate!: string;
  @ApiPropertyOptional({ enum: PAYMENT_METHODS }) @IsOptional() @IsIn(PAYMENT_METHODS) method?: (typeof PAYMENT_METHODS)[number];
  @ApiPropertyOptional({ description: 'UTR, cheque number…' }) @IsOptional() @Transform(trim) @IsString() @MaxLength(100) reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_NOTE_LENGTH) notes?: string;
}

export class VoidReceiptDto {
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty({ message: 'Say why this receipt is being voided' }) @MaxLength(MAX_NOTE_LENGTH) note!: string;
}

export class ReleaseRetentionDto {
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive({ message: 'Enter the amount to release' }) amount!: number;
  @ApiProperty({ example: '2026-11-15' }) @IsISO8601({ strict: true }) releasedOn!: string;
  @ApiPropertyOptional({ description: "e.g. the client's release letter or UTR" }) @IsOptional() @Transform(trim) @IsString() @MaxLength(100) reference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_NOTE_LENGTH) note?: string;
}
