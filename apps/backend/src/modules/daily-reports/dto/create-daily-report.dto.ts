import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsDateString, IsInt, IsOptional, IsString,
  Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { MAX_REPORT_LINE_ITEMS, MAX_REPORT_TEXT_LENGTH } from '../daily-reports.constants';
import {
  EquipmentUsedDto, LabourDetailsDto, MaterialConsumedDto, ReportIssueDto,
} from './daily-report-items.dto';

export class CreateDailyReportDto {
  @ApiProperty({ example: '2026-10-19' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) weather?: string | null;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  overallProgress?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_REPORT_TEXT_LENGTH)
  workCompleted?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(MAX_REPORT_TEXT_LENGTH)
  remarks?: string | null;

  @ApiPropertyOptional({ type: LabourDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LabourDetailsDto)
  labourDetails?: LabourDetailsDto;

  @ApiPropertyOptional({ type: [MaterialConsumedDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_REPORT_LINE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => MaterialConsumedDto)
  materialsConsumed?: MaterialConsumedDto[];

  @ApiPropertyOptional({ type: [EquipmentUsedDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_REPORT_LINE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => EquipmentUsedDto)
  equipmentUsed?: EquipmentUsedDto[];

  @ApiPropertyOptional({ type: [ReportIssueDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_REPORT_LINE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => ReportIssueDto)
  issues?: ReportIssueDto[];
}
