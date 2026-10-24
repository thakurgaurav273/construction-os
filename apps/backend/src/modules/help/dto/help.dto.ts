import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn } from 'class-validator';
import type { TourKey, TourStatus } from '@sitepilot/types';
import { TOUR_KEYS } from '../help-keys';

const TOUR_STATUSES: TourStatus[] = ['COMPLETED', 'SKIPPED'];

export class TourParamDto {
  @ApiProperty({ enum: TOUR_KEYS }) @IsIn(TOUR_KEYS) tour!: TourKey;
}

export class UpdateTourProgressDto {
  @ApiProperty({ enum: TOUR_STATUSES }) @IsIn(TOUR_STATUSES) status!: TourStatus;
}

export class UpdateChecklistDto {
  // Implicit conversion would turn the string "false" into true; keep the raw value so strings are rejected.
  @ApiProperty() @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.dismissed) @IsBoolean() dismissed!: boolean;
}
