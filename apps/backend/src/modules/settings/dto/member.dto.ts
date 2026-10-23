import { ApiProperty } from '@nestjs/swagger';
import { OrgRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, MaxLength } from 'class-validator';
import { normalizeEmail } from '../../auth/dto/password.dto';

export class ChangeMemberRoleDto {
  @ApiProperty({ enum: OrgRole }) @IsEnum(OrgRole, { message: 'Choose a valid role' }) role!: OrgRole;
}

export class InviteMemberDto {
  @ApiProperty() @Transform(normalizeEmail) @IsEmail({}, { message: 'Enter a valid email address' }) @MaxLength(254) email!: string;
  @ApiProperty({ enum: OrgRole }) @IsEnum(OrgRole, { message: 'Choose a valid role' }) role!: OrgRole;
}
