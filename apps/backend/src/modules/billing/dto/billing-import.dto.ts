import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { AnalyzeSheetDto, RunImportDto, SaveImportTemplateDto } from '../../data-import/dto/data-import.dto';

/** The entity is fixed by the route (BOQ on a contract, measurement book on a bill). */
export class BillingSheetDto extends OmitType(AnalyzeSheetDto, ['entity'] as const) {}

export class SaveBillingLayoutDto extends OmitType(SaveImportTemplateDto, ['entity'] as const) {}

export class BoqImportDto extends RunImportDto {
  @ApiProperty() @IsUUID() templateId!: string;

  @ApiPropertyOptional({ description: 'Number of the last bill raised before SitePilot; needed to carry previous quantities forward' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  lastBillNumber?: number;
}

/** Multipart forms send arrays as one JSON string. */
const parseJsonList = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export class MeasurementImportDto {
  @ApiProperty() @IsUUID() templateId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) sheetName?: string;

  @ApiPropertyOptional({ type: [String], description: 'Bill sections to import, e.g. ["RA Bill 2nd"]; all when omitted' })
  @IsOptional()
  @Transform(parseJsonList)
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  sections?: string[];
}
