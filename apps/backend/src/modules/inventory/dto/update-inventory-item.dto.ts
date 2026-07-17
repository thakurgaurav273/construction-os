import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateInventoryItemDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) reorderLevel?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) damaged?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) incoming?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() locationId?: string;
}
