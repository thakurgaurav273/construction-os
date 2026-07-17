/**
 * AI Command Center demo data.
 *
 * Everything here is deterministic and anchored to a fixed reference date
 * (2026-07-17, matching demo.ts and procurement-demo.ts). No `new Date()` or
 * randomness at module scope, so the server and client render identical markup
 * and React never flags a hydration mismatch.
 *
 * This module reuses the existing portfolio datasets (`@/data/demo`) so the
 * executive view stays consistent with the numbers shown inside the individual
 * modules.
 */

import { activeProjects } from '@/data/demo';

export type InsightTone = 'critical' | 'warning' | 'positive' | 'info';
export type ForecastDirection = 'up' | 'down' | 'flat';
export type ActionCategory = 'Procurement' | 'Schedule' | 'Workforce' | 'Finance' | 'Safety';
export type ActionPriority = 'high' | 'medium' | 'low';
export type TimelineKind = 'prediction' | 'detection' | 'approval' | 'report' | 'optimization';

export interface CrossProjectInsight {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
  project: string;
  impact: string;
  confidence: number;
}

export interface ForecastCardData {
  id: string;
  label: string;
  projected: string;
  detail: string;
  direction: ForecastDirection;
  deltaLabel: string;
  confidence: number;
  tone: InsightTone;
  spark: number[];
}

export interface SuggestedAction {
  id: string;
  title: string;
  rationale: string;
  impact: string;
  category: ActionCategory;
  priority: ActionPriority;
  actionLabel: string;
}

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  title: string;
  detail: string;
  project: string;
  timestamp: string;
}

export interface PortfolioForecastPoint {
  month: string;
  actual: number | null;
  forecast: number | null;
  budget: number;
}

export interface ProjectHealthPoint {
  project: string;
  progress: number;
  risk: number;
}

export interface ExecutiveSummaryData {
  headline: string;
  narrative: string;
  highlights: string[];
  generatedAtLabel: string;
}

const REFERENCE_DATE = new Date(2026, 6, 17, 9, 0, 0);

/** Fixed ISO timestamp `hoursAgo` before the reference date - deterministic across renders. */
function hoursBefore(hoursAgo: number): string {
  return new Date(REFERENCE_DATE.getTime() - hoursAgo * 3_600_000).toISOString();
}

// ── Portfolio roll-up (derived from the shared project dataset) ──────────────

export const portfolioBudget: number = activeProjects.reduce((sum, p) => sum + p.budget, 0);
export const portfolioSpent: number = activeProjects.reduce((sum, p) => sum + p.spent, 0);
export const budgetUtilization: number = Math.round((portfolioSpent / portfolioBudget) * 1000) / 10;
export const activeProjectCount: number = activeProjects.length;
export const flaggedProjectCount: number = activeProjects.filter(
  (p) => p.status === 'delayed' || p.status === 'at-risk',
).length;

/** AI-identified savings across the open recommendations, in rupees. */
export const forecastSavings = 4_260_000;

/** Portfolio schedule-risk index (0 = healthy, 100 = critical). */
export const portfolioRiskIndex = 34;

/** Modelled probability that the portfolio finishes within the current baseline. */
export const onTimeProbability = 82;

export const projectHealthData: ProjectHealthPoint[] = activeProjects.map((p) => ({
  project: p.name.split(' ').slice(0, 2).join(' '),
  progress: p.progress,
  risk:
    p.status === 'at-risk' ? 72 : p.status === 'delayed' ? 58 : Math.max(12, 40 - p.progress / 3),
}));

// ── Executive summary ────────────────────────────────────────────────────────

export const executiveSummary: ExecutiveSummaryData = {
  headline: 'Portfolio is stable, with two projects needing attention this week.',
  narrative:
    'Across four active projects worth ₹46Cr, spend is tracking at 55% of budget and 82% of milestones remain on baseline. NH-48 Highway Extension is the primary schedule risk at roughly 12 days behind, while Riverside Commercial Complex is showing early budget-overrun signals. AI has surfaced ₹42.6L of recoverable savings - mostly through consolidating cement and steel procurement before rates move again.',
  highlights: [
    'NH-48 is 12 days behind - reallocating 2 excavators from Smart City recovers ~5 days.',
    'Steel and cement rates are trending up; locking rate contracts this week avoids ₹9.9L exposure.',
    'Finance sign-off is the slowest approval stage at 4.8 days and holds 14 orders.',
    'Smart City Sector 9 is 78% complete and on track to hand over 3 weeks early.',
  ],
  generatedAtLabel: 'Generated today, 9:00 AM',
};

// ── Cross-project AI insights ────────────────────────────────────────────────

export const crossProjectInsights: CrossProjectInsight[] = [
  {
    id: 'cpi-1',
    tone: 'critical',
    title: 'NH-48 trending 12 days behind',
    body: 'Weather delays and slow earthworks have pushed NH-48 behind baseline. Reallocating 2 excavators from Smart City Sector 9 during its finishing phase recovers roughly 5 days at no extra cost.',
    project: 'NH-48 Highway Extension',
    impact: '~5 days recoverable',
    confidence: 88,
  },
  {
    id: 'cpi-2',
    tone: 'warning',
    title: 'Riverside early budget-overrun signal',
    body: 'Committed cost velocity on Riverside Commercial Complex is outpacing progress. At the current run-rate the project trends 6% over budget by handover. Review the substructure package now.',
    project: 'Riverside Commercial Complex',
    impact: '6% projected overrun',
    confidence: 74,
  },
  {
    id: 'cpi-3',
    tone: 'warning',
    title: 'Steel prices up 7% in 30 days',
    body: 'Fe500D TMT rates have risen 7% this month. Marina Bay still has 180 MT to procure - locking a rate contract this week avoids about ₹7.8L of exposure.',
    project: 'Marina Bay Residential Tower',
    impact: '₹7.8L exposure',
    confidence: 91,
  },
  {
    id: 'cpi-4',
    tone: 'positive',
    title: 'Smart City tracking for early handover',
    body: 'Smart City Sector 9 is 78% complete and ahead of curve. Current productivity trends put handover roughly 3 weeks early, freeing crews for the Riverside ramp-up.',
    project: 'Smart City Sector 9',
    impact: '~3 weeks early',
    confidence: 79,
  },
  {
    id: 'cpi-5',
    tone: 'positive',
    title: 'Bulk cement saving available',
    body: 'Consolidating four open cement indents across Marina Bay and Riverside into a single 2,400-bag order qualifies for the volume slab - an estimated 6% saving, about ₹2.1L.',
    project: 'Marina Bay Residential Tower',
    impact: '₹2.1L saving',
    confidence: 85,
  },
  {
    id: 'cpi-6',
    tone: 'info',
    title: 'Finance sign-off is the portfolio bottleneck',
    body: 'Finance sign-off averages 4.8 days across projects and holds 14 pending orders - the slowest stage in the procure-to-pay cycle. Raising the delegated approval limit would clear most of the queue.',
    project: 'All projects',
    impact: '14 orders held',
    confidence: 83,
  },
];

// ── Forecast cards ───────────────────────────────────────────────────────────

export const forecastCards: ForecastCardData[] = [
  {
    id: 'fc-budget',
    label: 'Budget at Completion',
    projected: '₹47.9Cr',
    detail: 'Forecast final cost vs ₹46Cr sanctioned',
    direction: 'up',
    deltaLabel: '+4.1% over budget',
    confidence: 76,
    tone: 'warning',
    spark: [44.0, 44.6, 45.1, 45.9, 46.6, 47.3, 47.9],
  },
  {
    id: 'fc-schedule',
    label: 'Portfolio Completion',
    projected: 'On baseline',
    detail: '82% of milestones on track across 4 sites',
    direction: 'flat',
    deltaLabel: 'NH-48 at risk',
    confidence: 82,
    tone: 'info',
    spark: [70, 72, 74, 78, 80, 81, 82],
  },
  {
    id: 'fc-materials',
    label: 'Material Cost Index',
    projected: '+5.8%',
    detail: 'Steel & cement rate outlook, next 30 days',
    direction: 'up',
    deltaLabel: 'Lock rate contracts',
    confidence: 88,
    tone: 'critical',
    spark: [100, 101, 102.5, 103, 104.2, 105.1, 105.8],
  },
  {
    id: 'fc-cashflow',
    label: 'Net Cash Outflow (Q3)',
    projected: '₹18.4Cr',
    detail: 'Projected disbursements across all projects',
    direction: 'up',
    deltaLabel: 'Within facility limit',
    confidence: 80,
    tone: 'positive',
    spark: [14.2, 15.1, 16.0, 16.8, 17.4, 17.9, 18.4],
  },
];

// ── Portfolio forecast chart (₹, per month) ──────────────────────────────────

export const portfolioForecastData: PortfolioForecastPoint[] = [
  { month: 'Feb', actual: 32_000_000, forecast: null, budget: 50_000_000 },
  { month: 'Mar', actual: 38_000_000, forecast: null, budget: 50_000_000 },
  { month: 'Apr', actual: 41_000_000, forecast: null, budget: 50_000_000 },
  { month: 'May', actual: 46_000_000, forecast: null, budget: 52_000_000 },
  { month: 'Jun', actual: 51_000_000, forecast: null, budget: 52_000_000 },
  { month: 'Jul', actual: 54_000_000, forecast: 54_000_000, budget: 54_000_000 },
  { month: 'Aug', actual: null, forecast: 57_000_000, budget: 54_000_000 },
  { month: 'Sep', actual: null, forecast: 60_000_000, budget: 56_000_000 },
  { month: 'Oct', actual: null, forecast: 62_000_000, budget: 56_000_000 },
  { month: 'Nov', actual: null, forecast: 59_000_000, budget: 58_000_000 },
  { month: 'Dec', actual: null, forecast: 55_000_000, budget: 58_000_000 },
];

// ── Suggested AI actions ─────────────────────────────────────────────────────

export const suggestedActions: SuggestedAction[] = [
  {
    id: 'act-1',
    title: 'Reallocate 2 excavators to NH-48',
    rationale: 'Smart City is in its finishing phase and no longer needs full earthmoving capacity.',
    impact: 'Recover ~5 days on the critical path',
    category: 'Schedule',
    priority: 'high',
    actionLabel: 'Draft reallocation',
  },
  {
    id: 'act-2',
    title: 'Lock a TMT steel rate contract',
    rationale: 'Fe500D rates are up 7% and Marina Bay still has 180 MT to procure.',
    impact: 'Avoid ₹7.8L of price exposure',
    category: 'Procurement',
    priority: 'high',
    actionLabel: 'Start rate contract',
  },
  {
    id: 'act-3',
    title: 'Consolidate open cement indents',
    rationale: 'Four indents across two projects qualify for the volume slab if merged.',
    impact: 'Save ~₹2.1L (6%)',
    category: 'Procurement',
    priority: 'medium',
    actionLabel: 'Merge indents',
  },
  {
    id: 'act-4',
    title: 'Raise the delegated approval limit',
    rationale: 'Finance sign-off is the slowest stage and holds 14 pending orders.',
    impact: 'Clear the approval backlog',
    category: 'Finance',
    priority: 'medium',
    actionLabel: 'Review policy',
  },
  {
    id: 'act-5',
    title: 'Review Riverside substructure cost',
    rationale: 'Cost velocity is outpacing progress - an early overrun signal.',
    impact: 'Protect 6% of budget',
    category: 'Finance',
    priority: 'high',
    actionLabel: 'Open cost review',
  },
];

export const pendingActionCount: number = suggestedActions.length;

// ── Organization timeline ────────────────────────────────────────────────────

export const organizationTimeline: TimelineEvent[] = [
  {
    id: 'tl-1',
    kind: 'prediction',
    title: 'Schedule risk detected on NH-48',
    detail: 'Model flagged a 12-day slip driven by weather and earthworks productivity.',
    project: 'NH-48 Highway Extension',
    timestamp: hoursBefore(2),
  },
  {
    id: 'tl-2',
    kind: 'optimization',
    title: 'Cement consolidation opportunity',
    detail: 'Four open indents identified as a single volume-slab order - ₹2.1L saving.',
    project: 'Marina Bay Residential Tower',
    timestamp: hoursBefore(5),
  },
  {
    id: 'tl-3',
    kind: 'detection',
    title: 'Budget-overrun signal on Riverside',
    detail: 'Committed cost velocity crossed the early-warning threshold.',
    project: 'Riverside Commercial Complex',
    timestamp: hoursBefore(9),
  },
  {
    id: 'tl-4',
    kind: 'approval',
    title: 'Revised structural drawings approved',
    detail: 'Sarah Jenkins approved the updated tower drawings.',
    project: 'Marina Bay Residential Tower',
    timestamp: hoursBefore(26),
  },
  {
    id: 'tl-5',
    kind: 'report',
    title: 'AI daily report generated',
    detail: 'Progress, workforce and material summaries compiled across all sites.',
    project: 'All projects',
    timestamp: hoursBefore(30),
  },
  {
    id: 'tl-6',
    kind: 'prediction',
    title: 'Early-handover forecast for Smart City',
    detail: 'Productivity trends put Sector 9 handover ~3 weeks ahead of baseline.',
    project: 'Smart City Sector 9',
    timestamp: hoursBefore(48),
  },
  {
    id: 'tl-7',
    kind: 'optimization',
    title: 'Steel rate-contract recommendation',
    detail: 'Rate lock recommended before the next projected price move.',
    project: 'Marina Bay Residential Tower',
    timestamp: hoursBefore(54),
  },
];
