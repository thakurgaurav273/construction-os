import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { ImportEntity } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, MaxLength, Min,
} from 'class-validator';

const MAX_HEADER_ROW = 50;

export class AnalyzeSheetDto {
  @ApiProperty({ enum: ImportEntity }) @IsEnum(ImportEntity) entity!: ImportEntity;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) sheetName?: string;

  @ApiPropertyOptional({ description: 'Row holding the headings; detected when omitted' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_HEADER_ROW)
  headerRow?: number;
}

export class SaveImportTemplateDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @ApiProperty({ enum: ImportEntity }) @IsEnum(ImportEntity) entity!: ImportEntity;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) @Max(MAX_HEADER_ROW) headerRow!: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  headers!: string[];

  @ApiProperty({ description: '{ columns, defaults, values, extras }; checked against the entity and headings' })
  @IsObject()
  mapping!: Record<string, unknown>;
}

export class UpdateImportTemplateDto extends OmitType(SaveImportTemplateDto, ['entity'] as const) {}

export class RunImportDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) sheetName?: string;

  @ApiPropertyOptional({ enum: ['skip', 'update'], description: 'What to do with rows that match an existing record' })
  @IsOptional()
  @IsIn(['skip', 'update'])
  onExisting?: 'skip' | 'update';
}

export class ImportTemplateQueryDto {
  @ApiPropertyOptional({ enum: ImportEntity }) @IsOptional() @IsEnum(ImportEntity) entity?: ImportEntity;
}
