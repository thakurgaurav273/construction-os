'use client';

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Users, Search, HardHat, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Badge,
  Progress,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@sitepilot/ui';
import { useWorkforce } from '@/hooks/api/use-workforce';
import { EmptyState } from '@/components/shared/EmptyState';

export default function WorkforcePage({ params }: { params: { id: string } }) {
  const { data: allWorkers = [], isLoading } = useWorkforce();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');

  function resetAddForm() {
    setNewName('');
    setNewRole('');
  }

  function handleAddPersonnel() {
    if (!newName.trim()) {
      toast.error('Enter a name.');
      return;
    }
    toast.success(`${newName.trim()} assigned to this project`);
    resetAddForm();
    setAddOpen(false);
  }

  const projectWorkers = useMemo(
    () => allWorkers.filter((w) => w.projectId === params.id),
    [allWorkers, params.id],
  );

  const stats = useMemo(() => {
    const total = projectWorkers.length;
    const present = projectWorkers.filter((w) => w.status === 'active' || w.status === 'late').length;
    const absent = projectWorkers.filter((w) => w.status === 'absent').length;
    const subcontractors = projectWorkers.filter((w) => w.type.toLowerCase() === 'subcontractor').length;
    const attendance = total > 0 ? (present / total) * 100 : 0;
    return { total, present, absent, subcontractors, attendance };
  }, [projectWorkers]);

  const trades = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of projectWorkers) {
      counts.set(w.trade, (counts.get(w.trade) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [projectWorkers]);

  const filtered = projectWorkers.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.role.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Workforce</h2>
          <p className="text-muted-foreground">Personnel assigned to this project.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>Add Personnel</Button>
      </div>

      {stats.total === 0 ? (
        <EmptyState
          icon={Users}
          title="No workforce assigned yet"
          description="Workers assigned to this project will appear here with attendance and trade breakdowns."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Personnel</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.attendance.toFixed(0)}%</div>
                <Progress value={stats.attendance} className="h-1.5 mt-2" indicatorColor="bg-emerald-500" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Absent</CardTitle>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.absent}</div>
                <p className="text-xs text-muted-foreground mt-1">worker{stats.absent === 1 ? '' : 's'} reported absent</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subcontractors</CardTitle>
                <HardHat className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.subcontractors}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Trade Distribution</CardTitle>
                <CardDescription>On-site trades for this project.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {trades.map((trade) => (
                  <div key={trade.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">{trade.name}</p>
                      <p className="text-sm text-muted-foreground">{trade.count}</p>
                    </div>
                    <Progress value={(trade.count / stats.total) * 100} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-2 flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Personnel Directory</CardTitle>
                    <CardDescription>Workers on this project.</CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search name or role..."
                      className="pl-9 bg-muted/50"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                {filtered.length === 0 ? (
                  <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border/60 rounded-xl bg-muted/20 m-2">
                    <Users className="h-8 w-8 text-primary/40 mb-4" />
                    <h3 className="font-semibold text-foreground mb-1">No personnel found</h3>
                    <p className="text-sm mb-4">No workers match your search.</p>
                    <Button variant="outline" onClick={() => setSearch('')}>Clear Search</Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filtered.map((worker) => (
                      <div
                        key={worker.id}
                        className="flex items-center gap-4 p-4 rounded-xl border bg-muted/20 hover:bg-muted/50 transition-colors"
                      >
                        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold shrink-0">
                          {worker.initials}
                        </div>
                        <div>
                          <p className="font-semibold">{worker.name}</p>
                          <p className="text-sm text-muted-foreground">{worker.role}</p>
                          <Badge variant="outline" className="mt-2 text-[10px] font-normal uppercase tracking-wider">
                            {worker.type.toLowerCase() === 'subcontractor' ? 'Subcontractor' : 'Employee'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          if (!o) resetAddForm();
          setAddOpen(o);
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Add Personnel</DialogTitle>
            <DialogDescription>Assign a worker to this project.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="personnel-name">Name</Label>
              <Input
                id="personnel-name"
                placeholder="e.g. Rajesh Kumar"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="personnel-role">Role / Trade</Label>
              <Input
                id="personnel-role"
                placeholder="e.g. Electrician"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetAddForm(); setAddOpen(false); }}>
              Cancel
            </Button>
            <Button onClick={handleAddPersonnel}>Add Personnel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
