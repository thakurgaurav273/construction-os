import { PartialType } from '@nestjs/swagger';
import { CreateDailyReportDto } from './create-daily-report.dto';

export class UpdateDailyReportDto extends PartialType(CreateDailyReportDto) {}
