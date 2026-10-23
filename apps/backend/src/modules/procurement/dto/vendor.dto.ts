import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize, IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength,
} from 'class-validator';
import { GSTIN_PATTERN } from '../../../common/validation/patterns';

export class CreateVendorDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) name!: string;

  @ApiPropertyOptional({ description: 'Generated (VN-0001) when omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9-]*$/, { message: 'Vendor code can only contain letters, digits and hyphens' })
  code?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  categories?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) contactPerson?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(120) email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(GSTIN_PATTERN, { message: 'Enter a valid 15-character GSTIN' })
  gstNumber?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) paymentTerms?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) city?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) state?: string | null;
}

export class UpdateVendorDto extends PartialType(CreateVendorDto) {}
