import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min,
} from 'class-validator';
import { WarehouseType } from '@prisma/client';

const emptyToNull = ({ value }: { value: unknown }): unknown => (value === '' ? null : value);
const CODE_PATTERN = /^[A-Za-z0-9-]+$/;

export class CreateWarehouseDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) name!: string;

  @ApiProperty({ example: 'WH-BLR-01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(CODE_PATTERN, { message: 'Use letters, digits and hyphens for the store code' })
  code!: string;

  @ApiProperty({ enum: WarehouseType }) @IsEnum(WarehouseType) type!: WarehouseType;

  @ApiPropertyOptional() @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(250) address?: string | null;
  @ApiPropertyOptional() @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(80) city?: string | null;
  @ApiPropertyOptional() @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(120) manager?: string | null;

  @ApiPropertyOptional({ description: 'Storage capacity in base units, used for utilisation' })
  @Transform(emptyToNull)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(1_000_000_000)
  capacity?: number | null;

  @ApiPropertyOptional({ description: 'Site stores belong to a project' })
  @Transform(emptyToNull)
  @IsOptional()
  @IsUUID()
  projectId?: string | null;
}

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {}

export class CreateLocationDto {
  @ApiProperty({ example: 'A-01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(CODE_PATTERN, { message: 'Use letters, digits and hyphens for the bin code' })
  code!: string;

  @ApiProperty({ example: 'Cement bay' }) @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @ApiPropertyOptional() @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(60) zone?: string | null;
}

export class UpdateLocationDto extends PartialType(CreateLocationDto) {}
