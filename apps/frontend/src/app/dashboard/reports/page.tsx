'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FileText, Download, Calendar, Clock, BarChart3, PieChart, ShieldAlert, Users, LayoutDashboard, Package, ShoppingCart, Wallet, Trash2, Play, Pause, Mail, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@sitepilot/ui';
import { Button } from '@sitepilot/ui';
import { Badge } from '@sitepilot/ui';
import { Skeleton } from '@sitepilot/ui';
import { Input } from '@sitepilot/ui';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@sitepilot/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sitepilot/ui';
import {
  useReportTemplates,
  useReportHistory,
  useReportSchedules,
  useGenerateReport,
  useCreateSchedule,
  useDeleteReport,
  useDeleteSchedule,
  useToggleSchedule,
  type GeneratedReport,
  type ReportSchedule,
  type ReportTemplate,
} from '@/hooks/api/use-reports';
import { Can } from '@/components/shared/Can';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, PieChart, Users, BarChart3, ShoppingCart, Package, Wallet, ShieldAlert,
};

const typeColors: Record<string, string> = {
  EXECUTIVE: 'text-purple-500 bg-purple-500/10',
  COST: 'text-blue-500 bg-blue-500/10',
  WORKFORCE: 'text-emerald-500 bg-emerald-500/10',
  SCHEDULE: 'text-amber-500 bg-amber-500/10',
  PROCUREMENT: 'text-orange-500 bg-orange-500/10',
  INVENTORY: 'text-cyan-500 bg-cyan-500/10',
  FINANCIAL: 'text-green-500 bg-green-500/10',
  SAFETY: 'text-red-500 bg-red-500/10',
};

const RECIPIENTS = ['Project Manager', 'Finance Manager', 'Director', 'CEO'];
const TIMEZONES = ['Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Dubai', 'Asia/Singapore'];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('templates');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);

  // Schedule form state
  const [schedFrequency, setSchedFrequency] = useState('WEEKLY');
  const [schedTime, setSchedTime] = useState('09:00');
  const [schedTimezone, setSchedTimezone] = useState('Asia/Kolkata');
  const [schedRecipients, setSchedRecipients] = useState<string[]>(['Project Manager']);
  const [schedEmails, setSchedEmails] = useState('');
  const [schedFormat, setSchedFormat] = useState('PDF');
  const [schedAiSummary, setSchedAiSummary] = useState(true);
  const [schedDeliveryEmail, setSchedDeliveryEmail] = useState(true);
  const [schedDeliveryDashboard, setSchedDeliveryDashboard] = useState(true);

  const { data: templates = [], isLoading: loadingTemplates } = useReportTemplates();
  const { data: historyData, isLoading: loadingHistory } = useReportHistory();
  const { data: schedules = [], isLoading: loadingSchedules } = useReportSchedules();

  const generateMutation = useGenerateReport();
  const createScheduleMutation = useCreateSchedule();
  const deleteReportMutation = useDeleteReport();
  const deleteScheduleMutation = useDeleteSchedule();
  const toggleScheduleMutation = useToggleSchedule();

  const history = Array.isArray(historyData) ? historyData : (historyData?.data ?? []);
  const total = Array.isArray(historyData) ? historyData.length : (historyData?.total ?? 0);

  const handleGenerate = async (template: ReportTemplate) => {
    try {
      toast.success(`Generating ${template.name}...`);
      await generateMutation.mutateAsync({ type: template.id, name: template.name });
      toast.success('Report generated successfully!');
    } catch {
      toast.error('Failed to generate report');
    }
  };

  const openScheduler = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setScheduleOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!selectedTemplate) return;
    try {
      await createScheduleMutation.mutateAsync({
        reportType: selectedTemplate.id,
        name: `${schedFrequency.charAt(0) + schedFrequency.slice(1).toLowerCase()} ${selectedTemplate.name}`,
        frequency: schedFrequency,
        time: schedTime,
        timezone: schedTimezone,
        recipients: schedRecipients,
        emails: schedEmails.split(',').map((e) => e.trim()).filter(Boolean),
        outputFormat: schedFormat,
        includeAiSummary: schedAiSummary,
      });
      toast.success('Schedule created successfully!');
      setScheduleOpen(false);
    } catch {
      toast.error('Failed to create schedule');
    }
  };

  const toggleRecipient = (r: string) => {
    setSchedRecipients((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Enterprise Reports</h2>
          <p className="text-muted-foreground mt-1">Generate, schedule, and export comprehensive project analytics.</p>
        </div>
        <div className="flex items-center gap-2 border rounded-md p-1 bg-muted/30">
          {['templates', 'history', 'schedules'].map((tab) => (
            <button
              key={tab}
              className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors capitalize ${activeTab === tab ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingTemplates ? (
            Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-12 mb-4" /><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-full" /></CardContent></Card>)
          ) : (
            templates.map((template) => {
              const Icon = iconMap[template.icon] || FileText;
              const colors = typeColors[template.id] || 'text-gray-500 bg-gray-500/10';
              return (
                <Card key={template.id} className="flex flex-col hover:border-primary/50 transition-colors group">
                  <CardHeader>
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${colors}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="mt-4">{template.name}</CardTitle>
                    <CardDescription className="h-10">{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex items-end">
                    <Can
                      permission="report.manage"
                      fallback={<p className="w-full pt-4 border-t text-xs text-muted-foreground">Ask a project manager or admin to generate this report.</p>}
                    >
                      <div className="w-full flex gap-2 pt-4 border-t">
                        <Button variant="outline" className="flex-1" onClick={() => handleGenerate(template)} disabled={generateMutation.isPending}>
                          {generateMutation.isPending ? 'Generating...' : 'Generate'}
                        </Button>
                        <Button variant="outline" size="icon" title="Schedule Report" onClick={() => openScheduler(template)}>
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </div>
                    </Can>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
            <CardDescription>History of all reports ({total} total).</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No reports generated yet.</div>
            ) : (
              <div className="rounded-xl border bg-card overflow-x-auto w-full">
                <table className="w-full text-sm text-left min-w-[600px]">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Report Name</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Date Generated</th>
                      <th className="px-4 py-3 font-medium">Generated By</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {history.map((item: GeneratedReport) => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4 font-medium flex items-center gap-3">
                          <FileText className={`h-4 w-4 ${item.format === 'PDF' ? 'text-red-500' : 'text-emerald-500'}`} />
                          {item.name}
                        </td>
                        <td className="px-4 py-4"><Badge variant="outline" className={typeColors[item.type]?.split(' ')[1] || ''}>{item.type}</Badge></td>
                        <td className="px-4 py-4 text-muted-foreground">{item.generatedAt ? format(new Date(item.generatedAt), 'MMM dd, yyyy HH:mm') : '-'}</td>
                        <td className="px-4 py-4 text-muted-foreground">{item.generatedBy}</td>
                        <td className="px-4 py-4"><Badge variant={item.status === 'COMPLETED' ? 'default' : 'secondary'}>{item.status}</Badge></td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm"><Download className="mr-2 h-4 w-4" /> Download</Button>
                            <Can permission="report.manage"><Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" aria-label="Delete report" onClick={() => deleteReportMutation.mutate(item.id)}><Trash2 className="h-4 w-4" /></Button></Can>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedules Tab */}
      {activeTab === 'schedules' && (
        <>
          {loadingSchedules ? (
            <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : schedules.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/10">
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <Clock className="h-16 w-16 mb-6 opacity-20" />
                <h3 className="text-xl font-bold text-foreground mb-2">No Active Schedules</h3>
                <p className="max-w-md mb-6">You haven&apos;t set up any automated report generation. Use the calendar icon on a report template to create one.</p>
                <Button onClick={() => setActiveTab('templates')}><Calendar className="mr-2 h-4 w-4" /> Go to Templates</Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule: ReportSchedule) => (
                <Card key={schedule.id} className={schedule.enabled ? '' : 'opacity-60'}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${schedule.enabled ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-500/10 text-gray-500'}`}>
                          <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{schedule.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {schedule.frequency} at {schedule.time} ({schedule.timezone}) • {schedule.outputFormat}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Next: {schedule.nextRunAt ? format(new Date(schedule.nextRunAt), 'MMM dd, yyyy HH:mm') : '-'}
                            {schedule.recipients.length > 0 && <> • Recipients: {schedule.recipients.join(', ')}</>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={schedule.enabled ? 'default' : 'secondary'}>{schedule.enabled ? 'Active' : 'Paused'}</Badge>
                        <Can permission="report.manage">
                          <Button variant="ghost" size="icon" aria-label={schedule.enabled ? 'Pause schedule' : 'Resume schedule'} onClick={() => toggleScheduleMutation.mutate(schedule.id)}>
                            {schedule.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" aria-label="Delete schedule" onClick={() => deleteScheduleMutation.mutate(schedule.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </Can>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Schedule Report Sheet */}
      <Sheet open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Schedule Report</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {/* Report Type */}
            <div>
              <label className="text-sm font-medium mb-2 block">Report Type</label>
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                {selectedTemplate && (() => { const Icon = iconMap[selectedTemplate.icon] || FileText; return <Icon className="h-5 w-5 text-muted-foreground" />; })()}
                <span className="font-medium">{selectedTemplate?.name}</span>
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label className="text-sm font-medium mb-2 block">Frequency</label>
              <Select value={schedFrequency} onValueChange={setSchedFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONCE">Once</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time */}
            <div>
              <label className="text-sm font-medium mb-2 block">Time</label>
              <Input type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} />
            </div>

            {/* Timezone */}
            <div>
              <label className="text-sm font-medium mb-2 block">Timezone</label>
              <Select value={schedTimezone} onValueChange={setSchedTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Recipients */}
            <div>
              <label className="text-sm font-medium mb-2 block">Recipients</label>
              <div className="flex flex-wrap gap-2">
                {RECIPIENTS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${schedRecipients.includes(r) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 border-border hover:bg-muted'}`}
                    onClick={() => toggleRecipient(r)}
                  >
                    {schedRecipients.includes(r) && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Emails */}
            <div>
              <label className="text-sm font-medium mb-2 block">Custom Email Addresses</label>
              <Input placeholder="email1@example.com, email2@example.com" value={schedEmails} onChange={(e) => setSchedEmails(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated list of email addresses</p>
            </div>

            {/* Output Format */}
            <div>
              <label className="text-sm font-medium mb-2 block">Output Format</label>
              <Select value={schedFormat} onValueChange={setSchedFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="EXCEL">Excel</SelectItem>
                  <SelectItem value="BOTH">Both (PDF + Excel)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Delivery Options */}
            <div>
              <label className="text-sm font-medium mb-2 block">Delivery Options</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={schedDeliveryEmail} onChange={(e) => setSchedDeliveryEmail(e.target.checked)} />
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={schedDeliveryDashboard} onChange={(e) => setSchedDeliveryDashboard(e.target.checked)} />
                  <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Dashboard History</span>
                </label>
              </div>
            </div>

            {/* AI Options */}
            <div>
              <label className="text-sm font-medium mb-2 block">AI Options</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" checked={schedAiSummary} onChange={(e) => setSchedAiSummary(e.target.checked)} />
                <span className="text-sm">Include AI Executive Summary</span>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => setScheduleOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSaveSchedule} disabled={createScheduleMutation.isPending}>
                {createScheduleMutation.isPending ? 'Saving...' : 'Save Schedule'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}