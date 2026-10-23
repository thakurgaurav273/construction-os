import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractDirection, MeasurementType, RaBillStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength,
  Min, ValidateNested,
} from 'class-validator';
import { MAX_ADJUSTMENT_RULES, MAX_CONTRACT_ITEMS, MAX_MEASUREMENTS_PER_ITEM, MAX_NOTE_LENGTH } from '../billing.constants';
import { AdjustmentRuleDto } from './contract.dto';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class CreateRaBillDto {
  @ApiProperty({ example: '2026-10-01' }) @IsISO8601({ strict: true }) periodFrom!: string;
  @ApiProperty({ example: '2026-10-31' }) @IsISO8601({ strict: true }) periodTo!: string;
  @ApiPropertyOptional({ description: "The party's own bill number" }) @IsOptional() @Transform(trim) @IsString() @MaxLength(80) reference?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class UpdateRaBillDto {
  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true }) periodFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true }) periodTo?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(80) reference?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;

  @ApiPropertyOptional({ type: [AdjustmentRuleDto], description: "Replaces this bill's taxes and deductions" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ADJUSTMENT_RULES)
  @ValidateNested({ each: true })
  @Type(() => AdjustmentRuleDto)
  adjustments?: AdjustmentRuleDto[];
}

export class MeasurementDto {
  @ApiProperty({ example: 'Wall-1' }) @Transform(trim) @IsString() @IsNotEmpty({ message: 'Describe each measurement' }) @MaxLength(300) description!: string;
  @ApiProperty({ enum: MeasurementType }) @IsEnum(MeasurementType) type!: MeasurementType;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) nos?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) length?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) breadth?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) height?: number | null;
  @ApiPropertyOptional({ description: 'kg per metre, for STEEL' }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) unitWeight?: number | null;
  @ApiPropertyOptional({ description: 'Entered quantity, for DIRECT' }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) quantity?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDeduction?: boolean;
}

export class ReplaceMeasurementsDto {
  @ApiProperty({ type: [MeasurementDto] })
  @IsArray()
  @ArrayMaxSize(MAX_MEASUREMENTS_PER_ITEM)
  @ValidateNested({ each: true })
  @Type(() => MeasurementDto)
  rows!: MeasurementDto[];
}

export class CertifiedLineDto {
  @ApiProperty() @IsUUID() contractItemId!: string;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) certifiedQuantity!: number;
  @ApiPropertyOptional({ example: 'Held due to deviation' }) @IsOptional() @Transform(trim) @IsString() @MaxLength(300) note?: string | null;
}

export class CertifyRaBillDto {
  @ApiPropertyOptional({ type: [CertifiedLineDto], description: 'Lines not listed are certified as claimed' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_CONTRACT_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => CertifiedLineDto)
  lines?: CertifiedLineDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_NOTE_LENGTH) note?: string;

  @ApiPropertyOptional({ description: 'Our tax invoice number to the client (client contracts only)' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  invoiceNumber?: string | null;
}

export class BillNoteDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(MAX_NOTE_LENGTH) note?: string;
}

export class RequiredBillNoteDto {
  @ApiProperty() @IsString() @IsNotEmpty({ message: 'Add a note explaining what needs to change' }) @MaxLength(MAX_NOTE_LENGTH) note!: string;
}

export class RaBillQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() contractId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional({ enum: ContractDirection }) @IsOptional() @IsEnum(ContractDirection) direction?: ContractDirection;
  @ApiPropertyOptional({ enum: RaBillStatus }) @IsOptional() @IsEnum(RaBillStatus) status?: RaBillStatus;
}
