import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SwitchOrganizationDto {
  @ApiProperty() @IsUUID() organizationId!: string;
}
