export class CreateDailyReportDto {
  date?: string;
  weather?: string;
  overallProgress?: number;
  workCompleted?: string;
  remarks?: string;
  labourCount?: number;
  status?: 'DRAFT' | 'SUBMITTED';
  labourDetails?: Record<string, unknown>;
  materialsConsumed?: Record<string, unknown>[];
  equipmentUsed?: Record<string, unknown>[];
  issues?: Record<string, unknown>[];
}
