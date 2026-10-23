import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH, normalizeEmail } from './password.dto';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100)
  name: string;

  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(254)
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(MIN_PASSWORD_LENGTH, { message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` })
  @MaxLength(128)
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Organization name is required' })
  @MaxLength(150)
  organizationName: string;
}
