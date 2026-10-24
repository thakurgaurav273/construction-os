import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaterialRequestStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsISO8601, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Max,
  MaxLength, ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export const MAX_REQUEST_LINES = 50;

/** `OPEN` lists everything still waiting on someone: pending, approved and part-issued requests. */
export const MATERIAL_REQUEST_STATUS_FILTERS = [...Object.values(MaterialRequestStatus), 'OPEN'] as const;
export type MaterialRequestStatusFilter = (typeof MATERIAL_REQUEST_STATUS_FILTERS)[number];

export class MaterialRequestLineDto {
  @ApiProperty()
  @IsUUID()
  materialId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Max(1_000_000_000)
  quantity!: number;
}

export class CreateMaterialRequestDto {
  @ApiProperty()
  @IsUUID()
  projectId!: string;

  @ApiPropertyOptional({ description: 'Day the site needs the material by' })
  @IsOptional()
  @IsISO8601()
  neededBy?: string;

  @ApiPropertyOptional({ description: 'What the material is for, e.g. "Slab casting, 3rd floor"' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiProperty({ type: [MaterialRequestLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_REQUEST_LINES)
  @ValidateNested({ each: true })
  @Type(() => MaterialRequestLineDto)
  items!: MaterialRequestLineDto[];
}

export class MaterialRequestQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: MATERIAL_REQUEST_STATUS_FILTERS })
  @IsOptional()
  @IsIn(MATERIAL_REQUEST_STATUS_FILTERS)
  status?: MaterialRequestStatusFilter;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;
}

export class IssueRequestLineDto {
  @ApiProperty({ description: 'Line of the request being issued' })
  @IsUUID()
  itemId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Max(1_000_000_000)
  quantity!: number;
}

/** Issues some or all of an approved request from one store; each line becomes a material issue note. */
export class IssueAgainstRequestDto {
  @ApiProperty({ description: 'Store the stock leaves from' })
  @IsUUID()
  warehouseId!: string;

  @ApiPropertyOptional({ description: 'Defaults to today' })
  @IsOptional()
  @IsISO8601()
  issuedOn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ type: [IssueRequestLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_REQUEST_LINES)
  @ValidateNested({ each: true })
  @Type(() => IssueRequestLineDto)
  lines!: IssueRequestLineDto[];
}
