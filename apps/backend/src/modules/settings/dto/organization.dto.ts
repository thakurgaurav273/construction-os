import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { GSTIN_PATTERN } from '../../../common/validation/patterns';

export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'QAR', 'SGD', 'AUD'] as const;

const TIMEZONES = new Set(Intl.supportedValuesOf('timeZone'));

@ValidatorConstraint({ name: 'timezone' })
class IsTimezone implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && (TIMEZONES.has(value) || value === 'UTC');
  }

  defaultMessage(): string {
    return 'Choose a valid time zone, e.g. Asia/Kolkata';
  }
}

const trimToNull = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

export class UpdateOrganizationSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Enter the organization name' })
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trimToNull)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() || null : value))
  @IsOptional()
  @Matches(GSTIN_PATTERN, { message: 'Enter a valid 15-character GSTIN' })
  gstNumber?: string | null;

  @ApiPropertyOptional({ enum: SUPPORTED_CURRENCIES })
  @IsOptional()
  @IsIn([...SUPPORTED_CURRENCIES], { message: 'Choose a supported currency' })
  currency?: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @Validate(IsTimezone)
  timezone?: string;
}
