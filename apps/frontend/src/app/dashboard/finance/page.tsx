'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Tabs, TabsList, TabsTrigger, TabsContent,
  Badge, Skeleton, Progress, Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@sitepilot/ui';
import {
  IndianRupee, Wallet, TrendingUp, TrendingDown, AlertTriangle,
  Info, Search, PiggyBank, Receipt, CreditCard, BarChart3, Lightbulb,
} from 'lucide-react';
import { useFinanceStats, useInvoices, usePayments, useBudget, useCashFlow, useFinanceInsights } from '@/hooks/api/use-finance';
import type { Invoice } from '@/hooks/api/use-finance';
import { ProcurementKpiCard } from '../procurement/components/ProcurementKpiCard';
import { formatCompactINR } from '../procurement/components/procurement-format';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

const INVOICE_STATUS_COLOR: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  SENT: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function FinancePage(): React.ReactElement {
  const { data: stats, isLoading: loadingStats } = useFinanceStats();
  const { data: invoices = [], isLoading: loadingInvoices } = useInvoices();
  const { data: payments = [], isLoading: loadingPayments } = usePayments();
  const { data: budget = [], isLoading: loadingBudget } = useBudget();
  const { data: cashFlow = [], isLoading: loadingCashFlow } = useCashFlow();
  const { data: insights = [], isLoading: loadingInsights } = useFinanceInsights();

  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = useMemo(() => {
    const term = invoiceSearch.toLowerCase();
    return invoices.filter((inv) => {
      const matchSearch = !term || inv.invoiceNumber.toLowerCase().includes(term) || inv.vendorName.toLowerCase().includes(term) || inv.projectName.toLowerCase().includes(term);
      const matchStatus = invoiceStatus === 'all' || inv.status === invoiceStatus;
      return matchSearch && matchStatus;
    });
  }, [invoices, invoiceSearch, invoiceStatus]);

  const burnRate = useMemo(() => {
    if (!cashFlow.length) return 0;
    return cashFlow.reduce((sum, e) => sum + e.outflow, 0) / cashFlow.length;
  }, [cashFlow]);

  const runway = useMemo(() => {
    if (!stats || burnRate === 0) return 0;
    return Math.round(stats.remainingBudget / burnRate);
  }, [stats, burnRate]);

  const isLoading = loadingStats || loadingInvoices || loadingPayments || loadingBudget || loadingCashFlow || loadingInsights;

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-3xl font-bold tracking-tight">Finance Command Center</h2>
        <p className="text-muted-foreground mt-1">Budget tracking, invoices, payments, and cash flow at a glance.</p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard title="Total Budget" value={formatCompactINR(stats?.totalBudget ?? 0)} description="allocated" icon={<PiggyBank className="h-4 w-4" />} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard title="Total Spent" value={formatCompactINR(stats?.totalSpent ?? 0)} description="disbursed" icon={<IndianRupee className="h-4 w-4" />} accentClass="border-amber-200 dark:border-amber-800/30" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard title="Remaining Budget" value={formatCompactINR(stats?.remainingBudget ?? 0)} description="available" icon={<Wallet className="h-4 w-4" />} accentClass="border-emerald-200 dark:border-emerald-800/30" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard title="Pending Payments" value={stats?.pendingPayments ?? 0} description="awaiting clearance" icon={<CreditCard className="h-4 w-4" />} accentClass="border-amber-200 dark:border-amber-800/30" />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard title="Cash Flow (Net)" value={formatCompactINR(stats?.netCashFlow ?? 0)} description="current period" icon={<TrendingUp className="h-4 w-4" />} trendDirection={(stats?.netCashFlow ?? 0) >= 0 ? 'up' : 'down'} trendLabel={(stats?.netCashFlow ?? 0) >= 0 ? 'positive' : 'negative'} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard title="Budget Variance" value={`${stats?.budgetVariance ?? 0}%`} description="vs plan" icon={<BarChart3 className="h-4 w-4" />} trendDirection={(stats?.budgetVariance ?? 0) >= 0 ? 'up' : 'down'} trendLabel={`${Math.abs(stats?.budgetVariance ?? 0)}%`} invertTrendColor />
        </motion.div>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Tabs defaultValue="budget">
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="budget">Budget Overview</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
            <TabsTrigger value="insights">Financial Insights</TabsTrigger>
          </TabsList>

          {/* TAB 1: Budget Overview */}
          <TabsContent value="budget">
            {budget.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No budget data available.</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Project</th>
                        <th className="px-4 py-3 text-left font-medium">Category</th>
                        <th className="px-4 py-3 text-right font-medium">Allocated</th>
                        <th className="px-4 py-3 text-right font-medium">Spent</th>
                        <th className="px-4 py-3 text-right font-medium">Committed</th>
                        <th className="px-4 py-3 text-right font-medium">Remaining</th>
                        <th className="px-4 py-3 text-left font-medium min-w-[160px]">Utilization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budget.map((b) => {
                        const color = b.utilizationPercent > 90 ? 'bg-red-500' : b.utilizationPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500';
                        return (
                          <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-3">{b.projectName}</td>
                            <td className="px-4 py-3">{b.category}</td>
                            <td className="px-4 py-3 text-right">{formatCompactINR(b.allocated)}</td>
                            <td className="px-4 py-3 text-right">{formatCompactINR(b.spent)}</td>
                            <td className="px-4 py-3 text-right">{formatCompactINR(b.committed)}</td>
                            <td className="px-4 py-3 text-right">{formatCompactINR(b.remaining)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Progress value={b.utilizationPercent} className={`h-2 flex-1 [&>div]:${color}`} />
                                <span className="text-xs w-10 text-right">{b.utilizationPercent}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 2: Invoices */}
          <TabsContent value="invoices" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input placeholder="Search invoice, vendor, project..." className="pl-9" value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} />
              </div>
              <Select value={invoiceStatus} onValueChange={setInvoiceStatus}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filteredInvoices.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No invoices found.</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Invoice #</th>
                        <th className="px-4 py-3 text-left font-medium">Vendor</th>
                        <th className="px-4 py-3 text-left font-medium">Project</th>
                        <th className="px-4 py-3 text-left font-medium">Category</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium">Due Date</th>
                        <th className="px-4 py-3 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                          <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                          <td className="px-4 py-3">{inv.vendorName}</td>
                          <td className="px-4 py-3">{inv.projectName}</td>
                          <td className="px-4 py-3">{inv.category}</td>
                          <td className="px-4 py-3 text-right">{formatCompactINR(inv.totalAmount)}</td>
                          <td className="px-4 py-3"><Badge className={INVOICE_STATUS_COLOR[inv.status] ?? ''}>{inv.status}</Badge></td>
                          <td className="px-4 py-3">{inv.dueDate ? format(new Date(inv.dueDate), 'dd MMM yyyy') : '—'}</td>
                          <td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); }}>View</Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
            <Sheet open={!!selectedInvoice} onOpenChange={(open) => { if (!open) setSelectedInvoice(null); }}>
              <SheetContent className="sm:max-w-lg overflow-y-auto">
                {selectedInvoice && (
                  <>
                    <SheetHeader>
                      <SheetTitle>Invoice {selectedInvoice.invoiceNumber}</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-4 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-muted-foreground">Vendor</span><p className="font-medium">{selectedInvoice.vendorName}</p></div>
                        <div><span className="text-muted-foreground">Project</span><p className="font-medium">{selectedInvoice.projectName}</p></div>
                        <div><span className="text-muted-foreground">Category</span><p className="font-medium">{selectedInvoice.category}</p></div>
                        <div><span className="text-muted-foreground">Status</span><p><Badge className={INVOICE_STATUS_COLOR[selectedInvoice.status] ?? ''}>{selectedInvoice.status}</Badge></p></div>
                        <div><span className="text-muted-foreground">Amount</span><p className="font-medium">{formatCompactINR(selectedInvoice.amount)}</p></div>
                        <div><span className="text-muted-foreground">Tax</span><p className="font-medium">{formatCompactINR(selectedInvoice.taxAmount)}</p></div>
                        <div><span className="text-muted-foreground">Total</span><p className="font-medium">{formatCompactINR(selectedInvoice.totalAmount)}</p></div>
                        <div><span className="text-muted-foreground">Issued</span><p className="font-medium">{selectedInvoice.issuedDate ? format(new Date(selectedInvoice.issuedDate), 'dd MMM yyyy') : '—'}</p></div>
                        <div><span className="text-muted-foreground">Due</span><p className="font-medium">{selectedInvoice.dueDate ? format(new Date(selectedInvoice.dueDate), 'dd MMM yyyy') : '—'}</p></div>
                        <div><span className="text-muted-foreground">Paid</span><p className="font-medium">{selectedInvoice.paidDate ? format(new Date(selectedInvoice.paidDate), 'dd MMM yyyy') : '—'}</p></div>
                      </div>
                      {selectedInvoice.description && <div><span className="text-muted-foreground">Description</span><p>{selectedInvoice.description}</p></div>}
                      {selectedInvoice.notes && <div><span className="text-muted-foreground">Notes</span><p>{selectedInvoice.notes}</p></div>}
                    </div>
                  </>
                )}
              </SheetContent>
            </Sheet>
          </TabsContent>

          {/* TAB 3: Payments */}
          <TabsContent value="payments">
            {payments.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No payments recorded.</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Payment #</th>
                        <th className="px-4 py-3 text-left font-medium">Vendor</th>
                        <th className="px-4 py-3 text-left font-medium">Project</th>
                        <th className="px-4 py-3 text-left font-medium">Category</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium">Method</th>
                        <th className="px-4 py-3 text-left font-medium">Due/Paid Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{p.paymentNumber}</td>
                          <td className="px-4 py-3">{p.vendorName}</td>
                          <td className="px-4 py-3">{p.projectName}</td>
                          <td className="px-4 py-3">{p.category}</td>
                          <td className="px-4 py-3 text-right">{formatCompactINR(p.amount)}</td>
                          <td className="px-4 py-3"><Badge className={PAYMENT_STATUS_COLOR[p.status] ?? ''}>{p.status}</Badge></td>
                          <td className="px-4 py-3">{p.method}</td>
                          <td className="px-4 py-3">{p.paidDate ? format(new Date(p.paidDate), 'dd MMM yyyy') : p.dueDate ? format(new Date(p.dueDate), 'dd MMM yyyy') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 4: Cash Flow */}
          <TabsContent value="cashflow" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Burn Rate</CardTitle><CardDescription>Avg monthly outflow</CardDescription></CardHeader>
                <CardContent><p className="text-2xl font-bold">{formatCompactINR(burnRate)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Runway</CardTitle><CardDescription>Months at current burn</CardDescription></CardHeader>
                <CardContent><p className="text-2xl font-bold">{runway} months</p></CardContent>
              </Card>
            </div>
            {cashFlow.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No cash flow data available.</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Month/Year</th>
                        <th className="px-4 py-3 text-right font-medium">Inflow</th>
                        <th className="px-4 py-3 text-right font-medium">Outflow</th>
                        <th className="px-4 py-3 text-right font-medium">Net</th>
                        <th className="px-4 py-3 text-right font-medium">Forecast In</th>
                        <th className="px-4 py-3 text-right font-medium">Forecast Out</th>
                        <th className="px-4 py-3 text-right font-medium">Forecast Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashFlow.map((cf) => (
                        <tr key={cf.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3">{cf.month}/{cf.year}</td>
                          <td className="px-4 py-3 text-right">{formatCompactINR(cf.inflow)}</td>
                          <td className="px-4 py-3 text-right">{formatCompactINR(cf.outflow)}</td>
                          <td className={`px-4 py-3 text-right font-medium ${cf.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatCompactINR(cf.net)}</td>
                          <td className="px-4 py-3 text-right">{formatCompactINR(cf.forecastInflow)}</td>
                          <td className="px-4 py-3 text-right">{formatCompactINR(cf.forecastOutflow)}</td>
                          <td className={`px-4 py-3 text-right font-medium ${cf.forecastNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatCompactINR(cf.forecastNet)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 5: Financial Insights */}
          <TabsContent value="insights">
            {insights.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No insights available yet.</CardContent></Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {insights.map((insight) => {
                  const iconMap: Record<string, React.ReactNode> = {
                    critical: <AlertTriangle className="h-5 w-5 text-red-500" />,
                    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
                    positive: <TrendingUp className="h-5 w-5 text-emerald-500" />,
                    info: <Info className="h-5 w-5 text-blue-500" />,
                  };
                  return (
                    <Card key={insight.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="flex flex-row items-start gap-3 pb-2">
                        <div className="mt-0.5">{iconMap[insight.tone] ?? <Info className="h-5 w-5 text-blue-500" />}</div>
                        <CardTitle className="text-sm font-semibold">{insight.title}</CardTitle>
                      </CardHeader>
                      <CardContent><p className="text-sm text-muted-foreground">{insight.body}</p></CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
