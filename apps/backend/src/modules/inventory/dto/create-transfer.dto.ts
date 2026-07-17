import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class TransferItemInput {
  @ApiProperty() @IsString() materialId!: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0.001) quantity!: number;
}

export class CreateTransferDto {
  @ApiProperty() @IsString() fromWarehouseId!: string;
  @ApiProperty() @IsString() toWarehouseId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() requestedBy?: string;
  @ApiProperty({ type: [TransferItemInput] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TransferItemInput)
  items!: TransferItemInput[];
}
