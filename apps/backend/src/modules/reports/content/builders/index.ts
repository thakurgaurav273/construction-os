import type { ReportBuilder } from '../report-document';
import { buildCostReport } from './cost.builder';
import { buildExecutiveReport } from './executive.builder';
import { buildFinancialReport } from './financial.builder';
import { buildInventoryReport } from './inventory.builder';
import { buildProcurementReport } from './procurement.builder';
import { buildSafetyReport } from './safety.builder';
import { buildScheduleReport } from './schedule.builder';
import { buildWorkforceReport } from './workforce.builder';

export const REPORT_BUILDERS: Record<string, ReportBuilder> = {
  EXECUTIVE: buildExecutiveReport,
  COST: buildCostReport,
  WORKFORCE: buildWorkforceReport,
  SCHEDULE: buildScheduleReport,
  PROCUREMENT: buildProcurementReport,
  INVENTORY: buildInventoryReport,
  FINANCIAL: buildFinancialReport,
  SAFETY: buildSafetyReport,
};
