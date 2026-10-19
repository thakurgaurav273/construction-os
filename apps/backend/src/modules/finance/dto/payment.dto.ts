import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';
import { PAYMENT_METHODS } from '../finance.constants';

export class CreatePaymentDto {
  @ApiProperty() @IsUUID() invoiceId!: string;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() amount!: number;

  @ApiPropertyOptional({ description: "Planned payment date; defaults to the invoice's due date" })
  @IsOptional()
  @IsISO8601({ strict: true })
  dueDate?: string;

  @ApiPropertyOptional({ enum: PAYMENT_METHODS }) @IsOptional() @IsIn(PAYMENT_METHODS) method?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class MarkPaidDto {
  @ApiProperty({ example: '2026-10-19' }) @IsISO8601({ strict: true }) paidDate!: string;

  @ApiProperty({ description: 'UTR, cheque number or transaction id' })
  @IsString()
  @IsNotEmpty({ message: 'Enter the bank reference (UTR or cheque number)' })
  @MaxLength(80)
  reference!: string;

  @ApiPropertyOptional({ enum: PAYMENT_METHODS }) @IsOptional() @IsIn(PAYMENT_METHODS) method?: string;
}

export class PaymentQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus }) @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() invoiceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() vendorId?: string;
}
