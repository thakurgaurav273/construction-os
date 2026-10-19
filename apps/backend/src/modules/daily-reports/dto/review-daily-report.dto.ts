import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveDailyReportDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class RejectDailyReportDto {
  @ApiProperty({ description: 'Tells the author what to correct before resubmitting' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  note!: string;
}
