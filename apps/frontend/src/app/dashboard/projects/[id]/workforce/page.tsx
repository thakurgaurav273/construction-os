'use client';

import React, { useMemo, useState } from 'react';
import { Users, Search, CheckCircle2, AlertCircle, ShieldCheck, ClipboardCheck } from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Input, Badge, Progress, Skeleton,
} from '@sitepilot/ui';
import { useProjectWorkforce, useProjectWorkforceStats } from '@/hooks/api/use-workforce';
import { EmptyState } from '@/components/shared/EmptyState';
import { ATTENDANCE_STATUS_STYLES, SHIFT_LABELS, WORKER_TYPE_LABELS } from '@/features/workforce/constants';
import { formatCheckIn, toDisplayStatus } from '@/features/workforce/utils/attendance';
import { MarkAttendanceSheet } from '@/features/workforce/components/MarkAttendanceSheet';

export default function WorkforcePage({ params }: { params: { id: string } }) {
  const { data: workers = [], isLoading, isError, refetch } = useProjectWorkforce(params.id);
  const { data: stats } = useProjectWorkforceStats(params.id);
  const [search, setSearch] = useState('');
  const [attendanceOpen, setAttendanceOpen] = useState(false);

  const trades = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of workers) counts.set(w.trade, (counts.get(w.trade) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [workers]);

  const filtered = workers.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.role.toLowerCase().includes(search.toLowerCase()) ||
      w.trade.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6 space-y-3">
              <Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" />
            </CardContent></Card>
          ))}
        </div>
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={Users}
        title="Unable to load this site's workforce"
        description="Check your connection and try again."
        action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  if (workers.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No workforce assigned yet"
        description="Assign workers to this project from the Workforce directory to track their daily attendance here."
      />
    );
  }

  const total          = stats?.total ?? workers.length;
  const presentToday   = stats?.presentToday ?? 0;
  const absentToday    = stats?.absentToday ?? 0;
  const notMarkedToday = stats?.notMarkedToday ?? 0;
  const subcontractors = stats?.subcontractors ?? 0;
  const attendance     = total > 0 ? (presentToday / total) * 100 : 0;
  const safety         = stats?.safetyCompliance ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Workforce</h2>
          <p className="text-muted-foreground">Personnel assigned to this project and today&apos;s attendance.</p>
        </div>
        <Button onClick={() => setAttendanceOpen(true)}>
          <ClipboardCheck className="mr-2 h-4 w-4" /> Mark Attendance
        </Button>
      </div>
      <MarkAttendanceSheet projectId={params.id} open={attendanceOpen} onOpenChange={setAttendanceOpen} />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Personnel</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground mt-1">{subcontractors} subcontractors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Site Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {presentToday}<span className="text-sm font-normal text-muted-foreground"> / {total}</span>
            </div>
            <Progress value={attendance} className="h-1.5 mt-2" indicatorColor="bg-emerald-500" />
            {notMarkedToday > 0 && <p className="text-xs text-muted-foreground mt-1">{notMarkedToday} not marked yet</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{absentToday}</div>
            <p className="text-xs text-muted-foreground mt-1">worker{absentToday === 1 ? '' : 's'} marked absent today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Safety Compliance</CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safety}%</div>
            <Progress value={safety} className="h-1.5 mt-2" indicatorColor="bg-blue-500" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Trade breakdown */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Trade Distribution</CardTitle>
            <CardDescription>On-site trades for this project.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {trades.map((trade) => (
              <div key={trade.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{trade.name}</p>
                  <p className="text-sm text-muted-foreground">{trade.count}</p>
                </div>
                <Progress value={(trade.count / total) * 100} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Personnel directory */}
        <Card className="md:col-span-2 flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Personnel Directory</CardTitle>
                <CardDescription>Workers on this project.</CardDescription>
              </div>
              <div className="relative w-64 shrink-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, role, trade…"
                  className="pl-9 bg-muted/50"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {filtered.length === 0 ? (
              <div className="min-h-[240px] flex flex-col items-center justify-center border border-dashed rounded-xl bg-muted/20 text-muted-foreground">
                <Users className="h-8 w-8 text-primary/40 mb-3" />
                <p className="font-medium text-foreground">No personnel found</p>
                <Button variant="outline" className="mt-4" onClick={() => setSearch('')}>Clear Search</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((worker) => {
                  const status = ATTENDANCE_STATUS_STYLES[toDisplayStatus(worker.todayStatus)];
                  return (
                  <div
                    key={worker.id}
                    className="flex items-start gap-3 p-4 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    {/* Avatar with status dot */}
                    <div className="relative shrink-0">
                      <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                        {worker.initials}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${status.dot}`}
                        title={status.label}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{worker.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{worker.role}</p>
                      <p className="text-xs text-muted-foreground">{worker.trade}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
                          {WORKER_TYPE_LABELS[worker.type]}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] font-normal px-1.5 py-0 ${status.text}`}>
                          {status.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-normal px-1.5 py-0">
                          {SHIFT_LABELS[worker.shift]} shift
                        </Badge>
                      </div>
                      {worker.lastCheckInAt && (
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">
                          Last check-in: {formatCheckIn(worker.lastCheckInAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
