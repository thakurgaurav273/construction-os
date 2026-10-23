import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export const MIN_PASSWORD_LENGTH = 8;

const normalizeEmail = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class ForgotPasswordDto {
  @ApiProperty()
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token from the reset link' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  token!: string;

  @ApiProperty()
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH, { message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` })
  @MaxLength(128)
  password!: string;
}

export { normalizeEmail };
