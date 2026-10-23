import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class AddMemberDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({ enum: MemberRole })
  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;
}

export class ChangeProjectRoleDto {
  @ApiProperty({ enum: MemberRole })
  @IsEnum(MemberRole, { message: 'Choose a valid project role' })
  role!: MemberRole;
}
