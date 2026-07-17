'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { FileText, Download, Calendar, Clock, BarChart3, PieChart, ShieldAlert, Users, LayoutDashboard, Settings2, FileOutput } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@sitepilot/ui';
import { Button } from '@sitepilot/ui';
import { Badge } from '@sitepilot/ui';

const reportTypes = [
  { id: 'executive', name: 'Executive Summary', icon: LayoutDashboard, desc: 'High-level overview of all active projects, financials, and major risks.', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'cost', name: 'Cost Analysis', icon: PieChart, desc: 'Detailed budget tracking, variances, and procurement spend.', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'labour', name: 'Labour & Workforce', icon: Users, desc: 'Attendance trends, trade distribution, and overtime analytics.', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'progress', name: 'Progress & Schedule', icon: BarChart3, desc: 'Milestone tracking, critical path analysis, and delays.', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'safety', name: 'Safety & Compliance', icon: ShieldAlert, desc: 'Incident reports, site audits, and compliance metrics.', color: 'text-red-500', bg: 'bg-red-500/10' },
];

const history = [
  { id: 'REP-1042', name: 'Executive Summary - Q3', date: 'Oct 15, 2023', type: 'PDF', size: '4.2 MB', generatedBy: 'Automated Schedule' },
  { id: 'REP-1041', name: 'Cost Analysis - September', date: 'Oct 1, 2023', type: 'Excel', size: '1.8 MB', generatedBy: 'Alex Manager' },
  { id: 'REP-1040', name: 'Safety Audit - Marina Bay', date: 'Sep 28, 2023', type: 'PDF', size: '3.1 MB', generatedBy: 'Sarah Safety' },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('templates');

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Enterprise Reports</h2>
          <p className="text-muted-foreground mt-1">Generate, schedule, and export comprehensive project analytics.</p>
        </div>
        <div className="flex items-center gap-2 border rounded-md p-1 bg-muted/30">
          <button 
            className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${activeTab === 'templates' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('templates')}
          >
            Templates
          </button>
          <button 
            className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${activeTab === 'history' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
          <button 
            className={`px-3 py-1.5 text-sm font-medium rounded-sm transition-colors ${activeTab === 'schedules' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setActiveTab('schedules')}
          >
            Schedules
          </button>
        </div>
      </div>

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportTypes.map((report) => (
            <Card key={report.id} className="flex flex-col hover:border-primary/50 transition-colors group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${report.bg} ${report.color}`}>
                    <report.icon className="h-6 w-6" />
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => toast('Template settings coming soon')}><Settings2 className="h-4 w-4" /></Button>
                </div>
                <CardTitle className="mt-4">{report.name}</CardTitle>
                <CardDescription className="h-10">{report.desc}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex items-end">
                <div className="w-full flex gap-2 pt-4 border-t">
                  <Button variant="outline" className="flex-1" onClick={() => toast.success(`Generating ${report.name}...`)}><FileOutput className="mr-2 h-4 w-4" /> Generate</Button>
                  <Button variant="outline" size="icon" title="Schedule Report" onClick={() => toast('Opening scheduler...')}><Calendar className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Card className="flex flex-col items-center justify-center border-dashed text-center hover:bg-muted/30 transition-colors cursor-pointer min-h-[250px]" onClick={() => toast('Custom report builder coming soon')}>
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-base">Custom Builder</CardTitle>
            <CardDescription className="max-w-[200px] mt-2">Create a new report template from scratch.</CardDescription>
          </Card>
        </div>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
            <CardDescription>History of all downloaded and emailed reports.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border bg-card overflow-x-auto w-full">
              <table className="w-full text-sm text-left min-w-[600px]">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Report Name</th>
                    <th className="px-4 py-3 font-medium">Date Generated</th>
                    <th className="px-4 py-3 font-medium">Generated By</th>
                    <th className="px-4 py-3 font-medium">Format</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4 font-medium flex items-center gap-3">
                        <FileText className={`h-4 w-4 ${item.type === 'PDF' ? 'text-red-500' : 'text-emerald-500'}`} />
                        {item.name}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{item.date}</td>
                      <td className="px-4 py-4 text-muted-foreground">{item.generatedBy}</td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="text-[10px]">{item.type} • {item.size}</Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => toast.success(`Downloading ${item.name}`)}><Download className="mr-2 h-4 w-4" /> Download</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'schedules' && (
        <Card className="border-dashed border-2 bg-muted/10">
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <Clock className="h-16 w-16 mb-6 opacity-20" />
            <h3 className="text-xl font-bold text-foreground mb-2">No Active Schedules</h3>
            <p className="max-w-md mb-6">You haven&apos;t set up any automated report generation. Automate your weekly progress or monthly cost reports to save time.</p>
            <Button onClick={() => toast('Schedule creation coming soon')}><Calendar className="mr-2 h-4 w-4" /> Create Schedule</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
