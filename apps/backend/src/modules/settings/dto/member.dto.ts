import { ApiProperty } from '@nestjs/swagger';
import { OrgRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsEmail, IsEnum, IsIn, MaxLength } from 'class-validator';
import type { Permission } from '@sitepilot/types';
import { ALL_PERMISSIONS } from '../../../common/permissions';
import { normalizeEmail } from '../../auth/dto/password.dto';

export class ChangeMemberRoleDto {
  @ApiProperty({ enum: OrgRole }) @IsEnum(OrgRole, { message: 'Choose a valid role' }) role!: OrgRole;
}

export class InviteMemberDto {
  @ApiProperty() @Transform(normalizeEmail) @IsEmail({}, { message: 'Enter a valid email address' }) @MaxLength(254) email!: string;
  @ApiProperty({ enum: OrgRole }) @IsEnum(OrgRole, { message: 'Choose a valid role' }) role!: OrgRole;
}

/** The full set a role or member should have; it is stored as changes from their defaults. */
export class UpdatePermissionsDto {
  @ApiProperty({ enum: ALL_PERMISSIONS, isArray: true })
  @IsArray()
  @ArrayUnique()
  @IsIn(ALL_PERMISSIONS, { each: true, message: 'Choose permissions from the list' })
  permissions!: Permission[];
}
