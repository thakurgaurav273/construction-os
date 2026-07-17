import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MemberRole } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class AddMemberDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  userId!: string;

  @ApiPropertyOptional({ enum: MemberRole })
  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;
}
