import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Max, MaxLength, ValidateNested,
} from 'class-validator';

export class TransferItemInput {
  @ApiProperty() @IsUUID() materialId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @Max(1_000_000_000)
  quantity!: number;
}

export class CreateTransferDto {
  @ApiProperty() @IsUUID() fromWarehouseId!: string;
  @ApiProperty() @IsUUID() toWarehouseId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) note?: string;

  @ApiProperty({ type: [TransferItemInput] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TransferItemInput)
  items!: TransferItemInput[];
}
