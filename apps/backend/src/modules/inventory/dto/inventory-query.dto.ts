import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class InventoryItemQueryDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() materialId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional({ enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCKED'] })
  @IsOptional()
  @IsString()
  status?: string;
  @ApiPropertyOptional({ description: "Pass 'true' to only return low/out-of-stock items" })
  @IsOptional()
  @IsString()
  lowStock?: string;
  @ApiPropertyOptional({ description: "Pass 'true' to only return items with reserved stock" })
  @IsOptional()
  @IsString()
  reserved?: string;
}

export class TransactionQueryDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() materialId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
  @ApiPropertyOptional({
    enum: ['RECEIVE', 'ISSUE', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'CONSUMPTION', 'RETURN', 'DAMAGE'],
  })
  @IsOptional()
  @IsString()
  type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateTo?: string;
}

export class TransferQueryDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() warehouseId?: string;
  @ApiPropertyOptional({
    enum: ['PENDING', 'APPROVED', 'IN_TRANSIT', 'COMPLETED', 'REJECTED', 'CANCELLED'],
  })
  @IsOptional()
  @IsString()
  status?: string;
}
