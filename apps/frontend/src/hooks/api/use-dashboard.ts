import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface DashboardStats {
  activeProjects: number;
  totalProjects: number;
  budgetUtilization: number;
  totalBudget: number;
  totalSpent: number;
  pendingApprovals: number;
  workforceToday: number;
  workforceTotal: number;
  workforceNotMarked: number;
  projects: {
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
  }[];
  recentActivity: {
    id: string;
    type: string;
    title: string;
    description: string | null;
    createdAt: string;
    actor: { id: string; name: string; avatar: string | null };
  }[];
  budgetTrend: { month: string; budget: number; spend: number }[];
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/stats');
      return res.data.data ?? res.data;
    },
    staleTime: 60_000,
  });
}
