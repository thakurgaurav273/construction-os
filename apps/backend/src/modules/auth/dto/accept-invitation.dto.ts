import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from './password.dto';

/**
 * New people set their name and a password. People who already have a SitePilot account confirm with
 * their existing password instead, which proves the invited email is theirs.
 */
export class AcceptInvitationDto {
  @ApiPropertyOptional({ description: 'Required when the invited email has no account yet' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Enter your name' })
  @MaxLength(100)
  name?: string;

  @ApiProperty()
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH, { message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` })
  @MaxLength(128)
  password!: string;
}
