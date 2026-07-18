import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface FinanceStats {
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  totalCommitted: number;
  pendingPayments: number;
  overdueInvoices: number;
  netCashFlow: number;
  budgetVariance: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  projectId: string | null;
  projectName: string;
  category: string;
  description: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  issuedDate: string | null;
  dueDate: string | null;
  paidDate: string | null;
  notes: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceNumber: string | null;
  vendorName: string;
  projectId: string | null;
  projectName: string;
  category: string;
  amount: number;
  status: string;
  method: string;
  reference: string;
  dueDate: string | null;
  paidDate: string | null;
  approvedBy: string | null;
  notes: string;
}

export interface BudgetItem {
  id: string;
  projectId: string;
  projectName: string;
  category: string;
  allocated: number;
  spent: number;
  committed: number;
  remaining: number;
  variance: number;
  utilizationPercent: number;
}

export interface CashFlowEntry {
  id: string;
  month: number;
  year: number;
  inflow: number;
  outflow: number;
  net: number;
  forecastInflow: number;
  forecastOutflow: number;
  forecastNet: number;
}

export interface FinanceInsight {
  id: string;
  tone: string;
  title: string;
  body: string;
}

export function useFinanceStats() {
  return useQuery<FinanceStats>({
    queryKey: ['finance', 'stats'],
    queryFn: async () => {
      const res = await apiClient.get('/finance/stats');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useInvoices() {
  return useQuery<Invoice[]>({
    queryKey: ['finance', 'invoices'],
    queryFn: async () => {
      const res = await apiClient.get('/finance/invoices');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function usePayments() {
  return useQuery<Payment[]>({
    queryKey: ['finance', 'payments'],
    queryFn: async () => {
      const res = await apiClient.get('/finance/payments');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useBudget() {
  return useQuery<BudgetItem[]>({
    queryKey: ['finance', 'budget'],
    queryFn: async () => {
      const res = await apiClient.get('/finance/budget');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useCashFlow() {
  return useQuery<CashFlowEntry[]>({
    queryKey: ['finance', 'cash-flow'],
    queryFn: async () => {
      const res = await apiClient.get('/finance/cash-flow');
      return res.data.data ?? res.data;
    },
    staleTime: 30_000,
  });
}

export function useFinanceInsights() {
  return useQuery<FinanceInsight[]>({
    queryKey: ['finance', 'insights'],
    queryFn: async () => {
      const res = await apiClient.get('/finance/insights');
      return res.data.data ?? res.data;
    },
    staleTime: 60_000,
  });
}
