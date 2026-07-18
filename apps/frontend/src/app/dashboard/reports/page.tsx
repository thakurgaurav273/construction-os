'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FileText, Download, Calendar, Clock, BarChart3, PieChart, ShieldAlert, Users, LayoutDashboard, Package, ShoppingCart, Wallet, Trash2, Play, Pause } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@sitepilot/ui';
import { Button } from '@sitepilot/ui';
import { Badge } from '@sitepilot/ui';
import { Skeleton } from '@sitepilot/ui';
import { 
  useReportTemplates, 
  useReportHistory, 
  useReportSchedules, 
  useGenerateReport,
  useDeleteReport,
  useDeleteSchedule,
  type GeneratedReport,
  type ReportSchedule 
} from '@/hooks/api/use-reports';

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('templates');
  
  const { data: templates = [], isLoading: loadingTemplates } = useReportTemplates();
  const { data: historyData, isLoading: loadingHistory } = useReportHistory();
  const { data: schedules = [], isLoading: loadingSchedules } = useReportSchedules();
  
  const generateMutation = useGenerateReport();
  const deleteReportMutation = useDeleteReport();
  const deleteScheduleMutation = useDeleteSchedule();

  const history = historyData?.data ?? [];
  const total = historyData?.total ?? 0;

  const handleGenerate = async (template: { id: string; name: string }) => {
    try {
      toast.success(`Generating ${template.name}...`);
      await generateMutation.mutateAsync({ type: template.id, name: template.name });
      toast.success('Report generated successfully!');
    } catch (e) {
      toast.error('Failed to generate report');
    }
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

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingTemplates ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-12 mb-4" /><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-full" /></CardContent></Card>
            ))
          ) : (
            templates.map((template) => {
              const Icon = iconMap[template.icon] || FileText;
              const colors = typeColors[template.id] || 'text-gray-500 bg-gray-500/10';
              const [bg, color] = colors.split(' ');
              return (
                <Card key={template.id} className="flex flex-col hover:border-primary/50 transition-colors group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${bg} ${color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                    <CardTitle className="mt-4">{template.name}</CardTitle>
                    <CardDescription className="h-10">{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex items-end">
                    <div className="w-full flex gap-2 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        className="flex-1" 
                        onClick={() => handleGenerate(template)}
                        disabled={generateMutation.isPending}
                      >
                        {generateMutation.isPending ? 'Generating...' : 'Generate'}
                      </Button>
                      <Button variant="outline" size="icon" title="Schedule" onClick={() => toast('Opening scheduler...')}><Calendar className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
            <CardDescription>History of all downloaded and emailed reports ({total} total).</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
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
                        <td className="px-4 py-4">
                          <Badge variant="outline" className={typeColors[item.type]?.split(' ')[1] || ''}>
                            {item.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {item.generatedAt ? format(new Date(item.generatedAt), 'MMM dd, yyyy') : '-'}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">{item.generatedBy}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Download className="mr-2 h-4 w-4" /> Download
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-600"
                              onClick={() => deleteReportMutation.mutate(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

      {activeTab === 'schedules' && (
        <>
          {loadingSchedules ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : schedules.length === 0 ? (
            <Card className="border-dashed border-2 bg-muted/10">
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <Clock className="h-16 w-16 mb-6 opacity-20" />
                <h3 className="text-xl font-bold text-foreground mb-2">No Active Schedules</h3>
                <p className="max-w-md mb-6">You haven&apos;t set up any automated report generation. Automate your weekly progress or monthly cost reports to save time.</p>
                <Button onClick={() => toast('Schedule creation coming soon')}><Calendar className="mr-2 h-4 w-4" /> Create Schedule</Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule: ReportSchedule) => (
                <Card key={schedule.id} className={schedule.enabled ? '' : 'opacity-60'}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${schedule.enabled ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-500/10 text-gray-500'}`}>
                          <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{schedule.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {schedule.frequency} • Next run: {schedule.nextRunAt ? format(new Date(schedule.nextRunAt), 'MMM dd, yyyy') : '-'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Recipients: {schedule.recipients.join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                          {schedule.enabled ? 'Active' : 'Paused'}
                        </Badge>
                        <Button variant="ghost" size="icon" className="text-muted-foreground">
                          {schedule.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-600"
                          onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}