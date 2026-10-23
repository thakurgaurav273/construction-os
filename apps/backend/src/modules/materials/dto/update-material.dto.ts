import { PartialType } from '@nestjs/swagger';
import { CreateMaterialDto } from './create-material.dto';

/**
 * Catalogue details only. Stock quantities change through receipts, issues, transfers and
 * adjustments so the per-store and organization totals never drift apart.
 */
export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {}
