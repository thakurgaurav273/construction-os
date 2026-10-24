export interface ApprovalQueue {
  kind: string;
  label: string;
  count: number;
  href: string;
}

export interface DashboardProject {
  id: string;
  name: string;
  status: string;
  priority: string;
  progress: number;
  budget: number | null;
  spent: number;
  location: string | null;
  expectedCompletion: string | null;
  memberCount: number;
  clientName: string | null;
}

export interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  createdAt: string;
  actor: { id: string; name: string; avatar: string | null };
}

export interface SpendTrendPoint {
  month: string;
  planned: number;
  actual: number;
}

export interface DashboardStats {
  activeProjects: number;
  totalProjects: number;
  newProjects: number;
  budgetUtilization: number;
  totalBudget: number;
  totalSpent: number;
  approvals: { total: number; queues: ApprovalQueue[] };
  workforceToday: number;
  workforceTotal: number;
  workforceNotMarked: number;
  projects: DashboardProject[];
  recentActivity: DashboardActivity[];
  /** Null for members without finance access. */
  spendTrend: SpendTrendPoint[] | null;
}
