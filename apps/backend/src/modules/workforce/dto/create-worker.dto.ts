import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString,
  Max, MaxLength, Min, ValidateNested,
} from 'class-validator';

const WORKER_TYPES = ['EMPLOYEE', 'SUBCONTRACTOR'] as const;
const WORKER_SHIFTS = ['DAY', 'NIGHT'] as const;

export class EmergencyContactDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(30) phone!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(40) relation!: string;
}

export class CreateWorkerDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(80) role!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(60) trade!: string;

  @ApiPropertyOptional({ enum: WORKER_TYPES })
  @IsOptional()
  @IsIn(WORKER_TYPES)
  type?: (typeof WORKER_TYPES)[number];

  @ApiPropertyOptional({ enum: WORKER_SHIFTS })
  @IsOptional()
  @IsIn(WORKER_SHIFTS)
  shift?: (typeof WORKER_SHIFTS)[number];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(120) email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  experienceYears?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) supervisor?: string | null;

  @ApiPropertyOptional({ description: 'Project the worker is assigned to; null unassigns' })
  @IsOptional()
  @IsString()
  projectId?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  skills?: string[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean() ppeCompliant?: boolean;

  @ApiPropertyOptional({ type: EmergencyContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact?: EmergencyContactDto | null;
}
