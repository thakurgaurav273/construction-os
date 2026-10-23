import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { MAX_CONTRACT_ITEMS } from '../billing.constants';

export class ItemLinkDto {
  @ApiProperty() @IsUUID() itemId!: string;
  @ApiPropertyOptional({ nullable: true, description: 'Client BOQ line it delivers; null to unlink' }) @IsOptional() @IsUUID() clientItemId?: string | null;
}

export class ItemLinksDto {
  @ApiProperty({ type: [ItemLinkDto] })
  @IsArray()
  @ArrayMaxSize(MAX_CONTRACT_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => ItemLinkDto)
  links!: ItemLinkDto[];
}

export class MarginQueryDto {
  @ApiProperty() @IsUUID() projectId!: string;
}

export class RecoverMaterialsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Choose at least one material to recover' })
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  materialIds!: string[];
}
