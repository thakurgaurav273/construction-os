import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { BillAdjustmentCalculation, BillAdjustmentEffect, ContractDirection, ContractStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsISO8601, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max,
  MaxLength, Min, ValidateNested,
} from 'class-validator';
import { MAX_ADJUSTMENT_RULES, MAX_CONTRACT_ITEMS } from '../billing.constants';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class AdjustmentRuleDto {
  @ApiProperty({ example: 'CGST 9%' }) @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(80) label!: string;
  @ApiProperty({ enum: BillAdjustmentEffect }) @IsEnum(BillAdjustmentEffect) effect!: BillAdjustmentEffect;
  @ApiProperty({ enum: BillAdjustmentCalculation }) @IsEnum(BillAdjustmentCalculation) calculation!: BillAdjustmentCalculation;
  @ApiProperty({ description: 'Percent for PERCENT, rupees for FIXED' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value!: number;

  @ApiPropertyOptional({ description: 'Held back and released later, e.g. security deposit or retention' })
  @IsOptional()
  @IsBoolean()
  isRetention?: boolean;
}

export class ContractItemDto {
  @ApiPropertyOptional({ description: 'Existing item to update; omit to add a new one' }) @IsOptional() @IsUUID() id?: string;
  @ApiProperty({ example: '50.1' }) @Transform(trim) @IsString() @IsNotEmpty({ message: 'Every BOQ line needs an item number' }) @MaxLength(30) itemNo!: string;
  @ApiPropertyOptional({ example: 'DSR 2.32' }) @IsOptional() @Transform(trim) @IsString() @MaxLength(40) rateCode?: string | null;
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty({ message: 'Every BOQ line needs a description' }) @MaxLength(2000) description!: string;
  @ApiProperty({ example: 'Sqm' }) @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(20) unit!: string;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) quantity!: number;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) rate!: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isExtra?: boolean;
}

export class CreateContractDto {
  @ApiProperty({ enum: ContractDirection }) @IsEnum(ContractDirection) direction!: ContractDirection;
  @ApiProperty() @IsUUID() projectId!: string;
  @ApiPropertyOptional({ description: 'Required for CLIENT contracts' }) @IsOptional() @IsUUID() clientId?: string | null;
  @ApiPropertyOptional({ description: 'The subcontractor, required for SUBCONTRACT contracts' }) @IsOptional() @IsUUID() vendorId?: string | null;
  @ApiPropertyOptional({ description: "The party's work order / PO number" }) @IsOptional() @Transform(trim) @IsString() @MaxLength(80) reference?: string | null;
  @ApiProperty({ description: 'Name of work' }) @Transform(trim) @IsString() @IsNotEmpty({ message: 'Enter the name of work' }) @MaxLength(300) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true }) startDate?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true }) endDate?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;

  @ApiPropertyOptional({ description: 'Days after certification that a bill falls due', default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  paymentTermDays?: number;

  @ApiPropertyOptional({ type: [AdjustmentRuleDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ADJUSTMENT_RULES)
  @ValidateNested({ each: true })
  @Type(() => AdjustmentRuleDto)
  adjustments?: AdjustmentRuleDto[];
}

/** Direction and project are fixed once a contract exists; its bills depend on them. */
export class UpdateContractDto extends PartialType(OmitType(CreateContractDto, ['direction', 'projectId'] as const)) {}

export class ReplaceContractItemsDto {
  @ApiProperty({ type: [ContractItemDto] })
  @IsArray()
  @ArrayMaxSize(MAX_CONTRACT_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => ContractItemDto)
  items!: ContractItemDto[];
}

export class ContractQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional({ enum: ContractDirection }) @IsOptional() @IsEnum(ContractDirection) direction?: ContractDirection;
  @ApiPropertyOptional({ enum: ContractStatus }) @IsOptional() @IsEnum(ContractStatus) status?: ContractStatus;
}
