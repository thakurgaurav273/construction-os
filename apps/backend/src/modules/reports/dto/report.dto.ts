import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { MAX_REPORT_PROJECTS, REPORT_FORMATS, REPORT_TYPES, SCHEDULE_FREQUENCIES } from '../reports.constants';

export class GenerateReportDto {
  @ApiProperty({ enum: REPORT_TYPES }) @IsIn([...REPORT_TYPES]) type!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiPropertyOptional({ enum: REPORT_FORMATS }) @IsOptional() @IsIn([...REPORT_FORMATS]) format?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_REPORT_PROJECTS)
  @IsUUID('all', { each: true })
  projectIds?: string[];
}

export class CreateScheduleDto {
  @ApiProperty({ enum: REPORT_TYPES }) @IsIn([...REPORT_TYPES]) reportType!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty({ enum: SCHEDULE_FREQUENCIES }) @IsIn([...SCHEDULE_FREQUENCIES]) frequency!: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Use a 24-hour time like 09:00' })
  time?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) timezone?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_REPORT_PROJECTS)
  @IsUUID('all', { each: true })
  projects?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Role labels that receive the report' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
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
