import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { GSTIN_PATTERN } from '../../../common/validation/patterns';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);

export class CreateClientDto {
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty({ message: 'Enter the client name' }) @MaxLength(150) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) contactPerson?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsEmail({}, { message: 'Enter a valid email address' }) @MaxLength(120) email?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(GSTIN_PATTERN, { message: 'Enter a valid 15-character GSTIN' })
  gstNumber?: string | null;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) address?: string | null;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {}
