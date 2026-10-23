import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type {
  BillableLine, BudgetHeadInput, BudgetLine, CashFlowEntry, FinanceSummary, Invoice, InvoiceDetail, InvoiceInput, InvoiceStatus,
  MarkPaidInput, Payment, PaymentInput, PaymentStatus, ProjectBudget,
} from '@/features/finance/types';

function unwrap<T>(res: { data: { data?: T } & T }): T {
  return res.data.data ?? res.data;
}

/** Bills and payments move KPIs, budgets and vendor balances (shown in procurement), so refresh both namespaces. */
function invalidateFinance(qc: QueryClient): void {
  qc.invalidateQueries({ queryKey: ['finance'] });
  qc.invalidateQueries({ queryKey: ['procurement', 'vendors'] });
  qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
  qc.invalidateQueries({ queryKey: ['timeline'] });
}

function useFinanceMutation<TInput, TResult>(request: (input: TInput) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: request, onSuccess: () => invalidateFinance(qc) });
}

/* ---------- Queries ---------- */

export function useFinanceSummary() {
  return useQuery<FinanceSummary>({
    queryKey: ['finance', 'summary'],
    queryFn: async () => unwrap(await apiClient.get('/finance/summary')),
    staleTime: 30_000,
  });
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  vendorId?: string;
  projectId?: string;
  purchaseOrderId?: string;
}

export function useInvoices(filters: InvoiceFilters = {}) {
  return useQuery<Invoice[]>({
    queryKey: ['finance', 'invoices', filters],
    queryFn: async () => unwrap(await apiClient.get('/finance/invoices', { params: filters })),
    staleTime: 30_000,
  });
}

export function useInvoice(id: string | null) {
  return useQuery<InvoiceDetail>({
    queryKey: ['finance', 'invoice', id],
    queryFn: async () => unwrap(await apiClient.get(`/finance/invoices/${id}`)),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useBillableLines(purchaseOrderId: string | null) {
  return useQuery<BillableLine[]>({
    queryKey: ['finance', 'billable-lines', purchaseOrderId],
    queryFn: async () => unwrap(await apiClient.get('/finance/invoices/billable-lines', { params: { purchaseOrderId } })),
    enabled: !!purchaseOrderId,
    staleTime: 0,
  });
}

export function usePayments(filters: { status?: PaymentStatus; invoiceId?: string; vendorId?: string } = {}) {
  return useQuery<Payment[]>({
    queryKey: ['finance', 'payments', filters],
    queryFn: async () => unwrap(await apiClient.get('/finance/payments', { params: filters })),
    staleTime: 30_000,
  });
}

export function useBudget() {
  return useQuery<BudgetLine[]>({
    queryKey: ['finance', 'budget'],
    queryFn: async () => unwrap(await apiClient.get('/finance/budget')),
    staleTime: 60_000,
  });
}

export function useProjectBudget(projectId: string, enabled = true) {
  return useQuery<ProjectBudget>({
    queryKey: ['finance', 'project-budget', projectId],
    queryFn: async () => unwrap(await apiClient.get(`/projects/${projectId}/budget`)),
    enabled: enabled && !!projectId,
    staleTime: 30_000,
  });
}

/** Head names only; anyone raising an order or bill can see them to file it correctly. */
export function useBudgetCategories(projectId: string | undefined) {
  return useQuery<string[]>({
    queryKey: ['finance', 'budget-categories', projectId],
    queryFn: async () => unwrap(await apiClient.get(`/projects/${projectId}/budget/categories`)),
    enabled: !!projectId,
    staleTime: 60_000,
  });
}

export function useCreateBudgetHead(projectId: string) {
  return useFinanceMutation(async (input: BudgetHeadInput): Promise<ProjectBudget> =>
    unwrap(await apiClient.post(`/projects/${projectId}/budget/heads`, input)));
}

export function useUpdateBudgetHead(projectId: string) {
  return useFinanceMutation(async ({ id, input }: { id: string; input: BudgetHeadInput }): Promise<ProjectBudget> =>
    unwrap(await apiClient.patch(`/projects/${projectId}/budget/heads/${id}`, input)));
}

export function useDeleteBudgetHead(projectId: string) {
  return useFinanceMutation(async (id: string): Promise<ProjectBudget> =>
    unwrap(await apiClient.delete(`/projects/${projectId}/budget/heads/${id}`)));
}

export function useCashFlow() {
  return useQuery<CashFlowEntry[]>({
    queryKey: ['finance', 'cash-flow'],
    queryFn: async () => unwrap(await apiClient.get('/finance/cash-flow')),
    staleTime: 60_000,
  });
}

/* ---------- Invoices ---------- */

export function useCreateInvoice() {
  return useFinanceMutation(async (input: InvoiceInput): Promise<InvoiceDetail> =>
    unwrap(await apiClient.post('/finance/invoices', input)));
}

export function useUpdateInvoice() {
  return useFinanceMutation(async ({ id, input }: { id: string; input: InvoiceInput }): Promise<InvoiceDetail> =>
    unwrap(await apiClient.patch(`/finance/invoices/${id}`, input)));
}

export type InvoiceTransition = 'submit' | 'approve' | 'reject' | 'cancel';

export function useInvoiceTransition() {
  return useFinanceMutation(
    async ({ id, transition, note }: { id: string; transition: InvoiceTransition; note?: string }): Promise<InvoiceDetail> =>
      unwrap(await apiClient.post(`/finance/invoices/${id}/${transition}`, note ? { note } : {})),
  );
}

/* ---------- Payments ---------- */

export function useCreatePayment() {
  return useFinanceMutation(async (input: PaymentInput): Promise<Payment> =>
    unwrap(await apiClient.post('/finance/payments', input)));
}

export type PaymentTransition = 'approve' | 'reject' | 'cancel';

export function usePaymentTransition() {
  return useFinanceMutation(
    async ({ id, transition, note }: { id: string; transition: PaymentTransition; note?: string }): Promise<Payment> =>
      unwrap(await apiClient.post(`/finance/payments/${id}/${transition}`, note ? { note } : {})),
  );
}

export function useMarkPaymentPaid() {
  return useFinanceMutation(async ({ id, input }: { id: string; input: MarkPaidInput }): Promise<Payment> =>
    unwrap(await apiClient.post(`/finance/payments/${id}/paid`, input)));
}
