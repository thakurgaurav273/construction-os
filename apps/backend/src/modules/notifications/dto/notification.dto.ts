import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { NOTIFICATION_CATEGORY_KEYS } from '../notification-categories';

export class NotificationQueryDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;

  @ApiPropertyOptional({ description: 'Only unread notifications' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ enum: NOTIFICATION_CATEGORY_KEYS, description: 'Only one preference group, e.g. approvals' })
  @IsOptional()
  @IsIn(NOTIFICATION_CATEGORY_KEYS)
  category?: string;
}

export class RegisterDeviceDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(4096) token!: string;
  @ApiProperty({ enum: ['WEB', 'ANDROID', 'IOS'] }) @IsIn(['WEB', 'ANDROID', 'IOS']) platform!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) browser?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) deviceName?: string;
}

export class CategoryPreferenceDto {
  @ApiProperty({ enum: NOTIFICATION_CATEGORY_KEYS }) @IsIn(NOTIFICATION_CATEGORY_KEYS) category!: string;
  @ApiProperty() @IsBoolean() inApp!: boolean;
  @ApiProperty() @IsBoolean() email!: boolean;
}

export class UpdatePreferencesDto {
  @ApiProperty({ type: [CategoryPreferenceDto] })
  @IsArray()
  @ArrayMaxSize(NOTIFICATION_CATEGORY_KEYS.length)
  @ValidateNested({ each: true })
  @Type(() => CategoryPreferenceDto)
  preferences!: CategoryPreferenceDto[];
}
