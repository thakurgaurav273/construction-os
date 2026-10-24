import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCertificationDto {
  @ApiProperty({ example: 'Safety Induction Certificate' }) @IsString() @IsNotEmpty() @MaxLength(120) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) issuer?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) certificateNumber?: string | null;
  @ApiPropertyOptional({ example: '2026-01-15' }) @IsOptional() @IsISO8601({ strict: true }) issuedOn?: string | null;
  @ApiPropertyOptional({ example: '2027-01-15', description: 'Leave empty for certificates that never expire.' })
  @IsOptional() @IsISO8601({ strict: true }) expiresOn?: string | null;
}

export class UpdateCertificationDto extends PartialType(CreateCertificationDto) {}
