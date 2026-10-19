import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DAILY_REPORT_STATUSES } from '../daily-reports.constants';

export class DailyReportQueryDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;

  @ApiPropertyOptional({ enum: DAILY_REPORT_STATUSES })
  @IsOptional()
  @IsIn(DAILY_REPORT_STATUSES)
  status?: (typeof DAILY_REPORT_STATUSES)[number];
}
