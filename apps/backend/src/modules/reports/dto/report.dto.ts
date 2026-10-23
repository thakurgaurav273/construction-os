import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { OrgRole } from '@prisma/client';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { MAX_REPORT_PROJECTS, REPORT_FORMATS, REPORT_TYPES, SCHEDULE_FREQUENCIES } from '../reports.constants';

export const DOWNLOAD_FORMATS = ['pdf', 'excel'] as const;

export class GenerateReportDto {
  @ApiProperty({ enum: REPORT_TYPES }) @IsIn([...REPORT_TYPES]) type!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiPropertyOptional({ enum: REPORT_FORMATS }) @IsOptional() @IsIn([...REPORT_FORMATS]) format?: string;

  @ApiPropertyOptional({ type: [String], description: 'Empty means every project' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_REPORT_PROJECTS)
  @IsUUID('all', { each: true })
  projectIds?: string[];

  @ApiPropertyOptional({ example: '2026-10-01', description: 'First day covered; defaults to 30 days ago' })
  @IsOptional()
  @IsDateString({}, { message: 'Choose a valid start date' })
  periodFrom?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'Last day covered; defaults to today' })
  @IsOptional()
  @IsDateString({}, { message: 'Choose a valid end date' })
  periodTo?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() includeAiSummary?: boolean;
}

export class CreateScheduleDto {
  @ApiProperty({ enum: REPORT_TYPES }) @IsIn([...REPORT_TYPES]) reportType!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty({ enum: SCHEDULE_FREQUENCIES }) @IsIn([...SCHEDULE_FREQUENCIES]) frequency!: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Use a 24-hour time like 09:00' })
  time?: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' }) @IsOptional() @IsString() @MaxLength(60) timezone?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_REPORT_PROJECTS)
  @IsUUID('all', { each: true })
  projects?: string[];

  @ApiPropertyOptional({ enum: OrgRole, isArray: true, description: 'Members with these roles receive the report' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(Object.keys(OrgRole).length)
  @IsIn(Object.values(OrgRole), { each: true, message: 'Choose recipients from your organization’s roles' })
  recipients?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true, message: 'Each email must be a valid address' })
  emails?: string[];

  @ApiPropertyOptional({ enum: REPORT_FORMATS }) @IsOptional() @IsIn([...REPORT_FORMATS]) outputFormat?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includeAiSummary?: boolean;
}

/** The report type is fixed once a schedule exists; create a new schedule to change it. */
export class UpdateScheduleDto extends PartialType(OmitType(CreateScheduleDto, ['reportType'] as const)) {}

export class ReportHistoryQueryDto extends PaginationDto {}

export class ReportDownloadQueryDto {
  @ApiProperty({ enum: DOWNLOAD_FORMATS }) @IsIn([...DOWNLOAD_FORMATS]) format!: (typeof DOWNLOAD_FORMATS)[number];
}
