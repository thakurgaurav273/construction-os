import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export type TransferAction = 'approve' | 'reject' | 'complete' | 'cancel';

export class UpdateTransferDto {
  @ApiProperty({ enum: ['approve', 'reject', 'complete', 'cancel'] })
  @IsIn(['approve', 'reject', 'complete', 'cancel'])
  action!: TransferAction;

  @ApiPropertyOptional() @IsOptional() @IsString() actor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}
