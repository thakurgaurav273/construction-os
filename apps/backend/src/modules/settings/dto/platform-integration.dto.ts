import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { STORAGE_PROVIDERS } from '../../../common/storage/saved-storage';

/** "noreply@example.com" or "SitePilot <noreply@example.com>". */
const SENDER_PATTERN = /^(?:[^<>@\r\n]{1,100} <)?[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>?$/;

export class SaveStorageIntegrationDto {
  @ApiProperty({ enum: STORAGE_PROVIDERS })
  @IsIn(STORAGE_PROVIDERS)
  provider!: 's3' | 'r2';

  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/, { message: 'Enter a bucket name: 3–63 lowercase letters, numbers, dots or hyphens' })
  bucket!: string;

  @ApiPropertyOptional({ description: 'Required for Amazon S3, e.g. ap-south-1' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2}(-gov)?-[a-z]+-\d$/, { message: 'Enter a region such as ap-south-1' })
  region?: string;

  @ApiPropertyOptional({ description: 'Only for S3-compatible servers other than Amazon S3' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  endpoint?: string;

  @ApiPropertyOptional({ description: 'Required for Cloudflare R2' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-f0-9]{32}$/i, { message: 'Enter the 32-character Cloudflare account ID' })
  accountId?: string;

  @ApiProperty({ description: 'Sent once, stored encrypted, never returned.' })
  @IsString()
  @MinLength(3, { message: 'That doesn’t look like a complete access key ID' })
  @MaxLength(128)
  accessKeyId!: string;

  @ApiProperty({ description: 'Sent once, stored encrypted, never returned.' })
  @IsString()
  @MinLength(3, { message: 'That doesn’t look like a complete secret access key' })
  @MaxLength(256)
  secretAccessKey!: string;
}

export class SaveEmailIntegrationDto {
  @ApiProperty({ description: 'A Resend API key with sending access. Sent once, stored encrypted, never returned.' })
  @IsString()
  @Matches(/^re_[A-Za-z0-9_]{10,}$/, { message: 'Enter a Resend API key (it starts with re_)' })
  @MaxLength(200)
  apiKey!: string;

  @ApiProperty({ example: 'SitePilot <noreply@yourcompany.com>' })
  @IsString()
  @MaxLength(200)
  @Matches(SENDER_PATTERN, { message: 'Enter a sender such as noreply@yourcompany.com' })
  fromAddress!: string;
}
