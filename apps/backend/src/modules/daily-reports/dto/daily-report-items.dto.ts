import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsString, Max, MaxLength, Min } from 'class-validator';
import { ISSUE_SEVERITIES } from '../daily-reports.constants';

export class LabourDetailsDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) skilled!: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) unskilled!: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) supervisors!: number;
}

export class MaterialConsumedDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) material!: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) quantity!: number;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(20) unit!: string;
}

export class EquipmentUsedDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) @Max(24) hours!: number;
}

export class ReportIssueDto {
  @ApiProperty({ enum: ISSUE_SEVERITIES })
  @IsIn(ISSUE_SEVERITIES)
  severity!: (typeof ISSUE_SEVERITIES)[number];

  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500) description!: string;
}
