'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock, ShieldAlert, TrendingUp, UserX, type LucideIcon } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@sitepilot/ui';
import type { WorkforceStats } from '@/hooks/api/use-workforce';

interface Alert {
  icon: LucideIcon;
  tone: string;
  title: string;
  detail: string;
}

const SAFETY_TARGET = 90;

function buildAlerts(stats: WorkforceStats): Alert[] {
  const alerts: Alert[] = [];
  if (stats.absentToday > 0) {
    alerts.push({ icon: UserX, tone: 'text-red-500', title: `${stats.absentToday} absent today`, detail: 'Check crew cover for today’s planned work.' });
  }
  if (stats.lateToday > 0) {
    alerts.push({ icon: Clock, tone: 'text-amber-500', title: `${stats.lateToday} late arrivals`, detail: 'Checked in more than 30 minutes after shift start.' });
  }
  if (stats.expiringCerts > 0) {
    alerts.push({ icon: AlertTriangle, tone: 'text-amber-500', title: 'Certifications expiring', detail: `${stats.expiringCerts} workers need renewal training soon.` });
  }
  if (stats.total > 0 && stats.safetyCompliance < SAFETY_TARGET) {
    alerts.push({ icon: ShieldAlert, tone: 'text-red-500', title: `PPE compliance at ${stats.safetyCompliance}%`, detail: `Below the ${SAFETY_TARGET}% site target.` });
  }
  if (stats.attendanceRate7d !== null) {
    alerts.push({ icon: TrendingUp, tone: 'text-emerald-500', title: `${stats.attendanceRate7d}% attendance this week`, detail: 'Across all marked days in the last 7 days, leave excluded.' });
  }
  return alerts;
}

/** Rule-based callouts from today's records. AI-generated insights arrive with the AI service (T17). */
export function WorkforceAlerts({ stats, onMarkAttendance }: { stats: WorkforceStats | undefined; onMarkAttendance: () => void }) {
  const alerts = stats ? buildAlerts(stats) : [];

  return (
    <Card className="border-primary/20 bg-primary/5 sticky top-6">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-primary text-sm">
          <AlertTriangle className="h-4 w-4" />
          Workforce Alerts
        </CardTitle>
        <CardDescription className="text-xs">From today&apos;s attendance and compliance records</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!stats && Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}

        {stats && stats.notMarkedToday > 0 && (
          <div className="bg-card border rounded-lg p-3 shadow-sm space-y-2">
            <p className="text-xs font-semibold">{stats.notMarkedToday} workers not marked today</p>
            <Button size="sm" className="w-full" onClick={onMarkAttendance}>
              <ClipboardCheck className="mr-2 h-3.5 w-3.5" /> Mark Attendance
            </Button>
          </div>
        )}

        {alerts.map(({ icon: Icon, tone, title, detail }) => (
          <div key={title} className="bg-card border rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${tone}`} />
              <span className="text-xs font-semibold">{title}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{detail}</p>
          </div>
        ))}

        {stats && alerts.length === 0 && stats.notMarkedToday === 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Nothing needs attention right now.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
