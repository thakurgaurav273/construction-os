'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge, Button, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@sitepilot/ui';
import { AlertTriangle, Download, Lock, Plus, Receipt } from 'lucide-react';
import { useBudget, useCashFlow, useFinanceSummary, useInvoices, usePayments } from '@/hooks/api/use-finance';
import { downloadCsv } from '@/lib/download-csv';
import { useCurrentAccess } from '@/hooks/api/use-access';
import { EmptyState } from '@/components/shared/EmptyState';
import { AiInsightPanel } from '@/components/shared/AiInsightPanel';
import { InvoiceFormDialog } from '@/features/finance/components/InvoiceFormDialog';
import { buildFinanceInsights, type FinanceInsight } from '@/features/finance/utils/insights';
import { FinanceKpis } from './components/FinanceKpis';
import { InvoicesTab } from './components/InvoicesTab';
import { PaymentsTab } from './components/PaymentsTab';
import { BudgetTab } from './components/BudgetTab';
import { CashFlowTab } from './components/CashFlowTab';
import { InvoiceDrawer } from './components/InvoiceDrawer';

function FinanceLoading(): React.ReactElement {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-80" /></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-[118px] rounded-xl" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-4">
        <Skeleton className="h-96 rounded-xl xl:col-span-3" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export default function FinancePage(): React.ReactElement {
  const { data: access, isLoading: isLoadingAccess } = useCurrentAccess();
  if (isLoadingAccess) return <FinanceLoading />;
  if (!access?.permissions.includes('finance.view')) {
    return (
      <div className="flex-1 p-4 md:p-8 pt-6">
        <EmptyState
          icon={Lock}
          title="Finance is restricted"
          description="Invoices, payments and budgets are visible to finance, project managers and admins. Ask an admin if you need access."
        />
      </div>
    );
  }
  return <FinanceWorkspace canRecordInvoice={access.permissions.includes('invoice.create')} />;
}

function FinanceWorkspace({ canRecordInvoice }: { canRecordInvoice: boolean }): React.ReactElement {
  const [tab, setTab] = useState('invoices');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const invoicesQuery = useInvoices();
  const { data: payments = [] } = usePayments();
  const { data: summary } = useFinanceSummary();
  const { data: budget = [] } = useBudget();
  const { data: cashFlow = [] } = useCashFlow();

  const invoices = useMemo(() => invoicesQuery.data ?? [], [invoicesQuery.data]);
  const insights = useMemo(() => (summary ? buildFinanceInsights(summary) : undefined), [summary]);
  const paymentsNeedingAction = payments.filter((payment) => payment.status === 'PENDING' || payment.status === 'APPROVED').length;

  function handleInsight(insight: FinanceInsight): void {
    if (insight.target) setSelectedInvoiceId(insight.target.id);
  }

  function handleExport(): void {
    if (invoices.length === 0) {
      toast.error('No invoices to export');
      return;
    }
    downloadCsv(
      `vendor_invoices_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      ['Invoice No', 'Vendor', 'Project', 'PO', 'Invoice Date', 'Due Date', 'Taxable (INR)', 'GST (INR)', 'Total (INR)', 'Paid (INR)', 'Balance (INR)', 'Status', 'Overdue Days', '3-way Match'],
      invoices.map((invoice) => [
        invoice.invoiceNumber, invoice.vendorName, invoice.project?.name, invoice.purchaseOrder?.poNumber,
        invoice.issuedDate.slice(0, 10), invoice.dueDate.slice(0, 10), invoice.amount, invoice.taxAmount,
        invoice.totalAmount, invoice.paidAmount, invoice.balanceDue, invoice.status, invoice.daysOverdue, invoice.matchStatus,
      ]),
    );
    toast.success(`Exported ${invoices.length} invoices`);
  }

  if (invoicesQuery.isLoading) return <FinanceLoading />;

  if (invoicesQuery.isError) {
    return (
      <div className="flex-1 p-4 md:p-8 pt-6">
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load finance"
          description="Vendor invoices couldn't be fetched. Check your connection and try again."
          action={<Button onClick={() => invoicesQuery.refetch()}>Retry</Button>}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Finance</h2>
          <p className="text-muted-foreground mt-1">
            {summary
              ? `${summary.approvals.invoicesPending} bills awaiting approval · ${summary.payables.overdueCount} overdue`
              : 'Vendor bills, payments, budgets and cash flow'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
          {canRecordInvoice && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Record Invoice
            </Button>
          )}
        </div>
      </motion.div>

      <FinanceKpis summary={summary} />

      <div className="grid gap-6 xl:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-3 min-w-0"
        >
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4 flex-wrap h-auto">
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="payments" className="gap-1.5">
                Payments
                {paymentsNeedingAction > 0 && <Badge variant="warning" className="h-5 px-1.5 text-[10px]">{paymentsNeedingAction}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="budget">Budget</TabsTrigger>
              <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
            </TabsList>

            <TabsContent value="invoices">
              {invoices.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No vendor invoices yet"
                  description="Record a bill when it arrives. Bills against purchase orders are checked against what was ordered and received."
                  action={canRecordInvoice ? <Button onClick={() => setCreateOpen(true)}>Record Invoice</Button> : undefined}
                />
              ) : (
                <InvoicesTab invoices={invoices} onSelect={(invoice) => setSelectedInvoiceId(invoice.id)} />
              )}
            </TabsContent>

            <TabsContent value="payments">
              <PaymentsTab payments={payments} onOpenInvoice={setSelectedInvoiceId} />
            </TabsContent>

            <TabsContent value="budget">
              <BudgetTab budget={budget} />
            </TabsContent>

            <TabsContent value="cashflow">
              <CashFlowTab cashFlow={cashFlow} remainingBudget={summary?.budget.remaining ?? 0} />
            </TabsContent>
          </Tabs>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="xl:col-span-1">
          <AiInsightPanel title="AI Finance Insights" insights={insights} onSelect={handleInsight} className="sticky top-6" />
        </motion.div>
      </div>

      <InvoiceDrawer invoiceId={selectedInvoiceId} onClose={() => setSelectedInvoiceId(null)} />
      <InvoiceFormDialog open={createOpen} onOpenChange={setCreateOpen} onSaved={setSelectedInvoiceId} />
    </div>
  );
}
