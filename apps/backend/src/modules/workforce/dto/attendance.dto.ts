import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength,
  ValidateNested,
} from 'class-validator';
import { ATTENDANCE_STATUSES, MAX_BULK_ATTENDANCE_ENTRIES } from '../workforce.constants';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_KEY_MESSAGE = 'date must be formatted as YYYY-MM-DD';

export class AttendanceEntryDto {
  @ApiProperty() @IsString() @IsNotEmpty() workerId!: string;

  @ApiProperty({ enum: ATTENDANCE_STATUSES })
  @IsIn(ATTENDANCE_STATUSES)
  status!: (typeof ATTENDANCE_STATUSES)[number];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) notes?: string | null;
}

export class MarkAttendanceDto {
  @ApiProperty({ example: '2026-10-19' })
  @Matches(DATE_KEY_PATTERN, { message: DATE_KEY_MESSAGE })
  date!: string;

  @ApiProperty({ type: [AttendanceEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_BULK_ATTENDANCE_ENTRIES)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];
}

export class AttendanceDateQueryDto {
  @ApiPropertyOptional({ example: '2026-10-19', description: "Defaults to today in the organization's timezone" })
  @IsOptional()
  @Matches(DATE_KEY_PATTERN, { message: DATE_KEY_MESSAGE })
  date?: string;
}

export class WorkerShiftEventDto {
  @ApiProperty() @IsString() @IsNotEmpty() workerId!: string;
}

export class ProjectFilterQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
}

export class WorkforceQueryDto extends ProjectFilterQueryDto {
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  includeInactive?: 'true' | 'false';
}
