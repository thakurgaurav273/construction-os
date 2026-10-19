'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Sheet, SheetContent, SheetTitle,
  Badge, Button, ScrollArea,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@sitepilot/ui';
import {
  Phone, Mail, Award, ShieldCheck, ShieldAlert,
  User, AlertTriangle, CheckCircle2,
  UserPlus, X, Star, Building2, Pencil, MoreHorizontal, UserX, UserCheck,
} from 'lucide-react';
import { useSetWorkerActive, type CertStatus, type Worker } from '@/hooks/api/use-workforce';
import { getApiErrorMessage } from '@/lib/api/errors';
import { ATTENDANCE_STATUS_STYLES, SHIFT_LABELS, WORKER_TYPE_LABELS } from '@/features/workforce/constants';
import { attendanceRateTone, toDisplayStatus } from '@/features/workforce/utils/attendance';
import { AssignProjectDialog } from '@/features/workforce/components/AssignProjectDialog';
import { WorkerFormDialog } from '@/features/workforce/components/WorkerFormDialog';
import { WorkerAttendanceCard } from './WorkerAttendanceCard';

interface WorkerDrawerProps {
  worker: Worker | null;
  open: boolean;
  onClose: () => void;
}

const CERT_STATUS_CONFIG: Record<CertStatus, { label: string; bar: string; text: string; icon: React.ReactNode }> = {
  valid: {
    label: 'Valid',
    bar: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  },
  expiring: {
    label: 'Expiring',
    bar: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  },
  expired: {
    label: 'Expired',
    bar: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    icon: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
  },
};

const AVATAR_PALETTE = [
  { bg: 'bg-blue-500',   gradient: 'from-blue-500/20 via-blue-500/5 to-transparent',    ring: 'ring-blue-500/30' },
  { bg: 'bg-emerald-500', gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent', ring: 'ring-emerald-500/30' },
  { bg: 'bg-violet-500', gradient: 'from-violet-500/20 via-violet-500/5 to-transparent', ring: 'ring-violet-500/30' },
  { bg: 'bg-amber-500',  gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',   ring: 'ring-amber-500/30' },
  { bg: 'bg-rose-500',   gradient: 'from-rose-500/20 via-rose-500/5 to-transparent',     ring: 'ring-rose-500/30' },
  { bg: 'bg-cyan-500',   gradient: 'from-cyan-500/20 via-cyan-500/5 to-transparent',     ring: 'ring-cyan-500/30' },
  { bg: 'bg-indigo-500', gradient: 'from-indigo-500/20 via-indigo-500/5 to-transparent', ring: 'ring-indigo-500/30' },
  { bg: 'bg-orange-500', gradient: 'from-orange-500/20 via-orange-500/5 to-transparent', ring: 'ring-orange-500/30' },
];

function getPalette(workerId: string) {
  const hash = [...workerId].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9973, 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function WorkerDrawer({ worker, open, onClose }: WorkerDrawerProps): React.ReactElement {
  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const setWorkerActive = useSetWorkerActive();

  if (!worker) return <></>;

  async function toggleActive(target: Worker): Promise<void> {
    try {
      await setWorkerActive.mutateAsync({ workerId: target.id, active: !target.isActive });
      toast.success(target.isActive ? `${target.name} deactivated` : `${target.name} reactivated`);
      if (target.isActive) onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't update the worker. Try again."));
    }
  }

  const palette = getPalette(worker.id);
  const status = ATTENDANCE_STATUS_STYLES[toDisplayStatus(worker.todayStatus)];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-[460px] p-0 flex flex-col overflow-hidden [&>button:last-child]:hidden">
        <SheetTitle className="sr-only">Worker Profile - {worker.name}</SheetTitle>

        {/* ── Sticky Hero Header ── */}
        <div className={`relative bg-gradient-to-br ${palette.gradient} border-b pb-5 shrink-0`}>
          <button
            onClick={onClose}
            aria-label="Close worker profile"
            className="absolute top-3.5 right-3.5 z-10 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="px-5 pt-6">
            <div className="flex items-center gap-4">
              <div className={`relative h-16 w-16 shrink-0 rounded-2xl ${palette.bg} ring-4 ${palette.ring} shadow-lg flex items-center justify-center`}>
                <span className="text-white text-xl font-bold tracking-tight">{worker.initials}</span>
                <span className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-background ${status.dot}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h3 className="text-lg font-bold leading-tight">{worker.name}</h3>
                  <span className={`text-xs font-semibold ${status.text}`}>{worker.isActive ? status.label : 'Inactive'}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{worker.role}</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <Badge variant="secondary" className="text-[11px] h-5 px-2">{worker.trade}</Badge>
                  <Badge variant="outline" className="text-[11px] h-5 px-2 bg-background/60">{WORKER_TYPE_LABELS[worker.type]}</Badge>
                  <Badge variant="outline" className="text-[11px] h-5 px-2 bg-background/60">{SHIFT_LABELS[worker.shift]} Shift</Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center mt-4 rounded-xl bg-background/70 backdrop-blur-sm border border-border/50 divide-x divide-border/50 overflow-hidden">
              <div className="flex-1 px-3 py-2.5 text-center">
                <p className="text-[10px] text-muted-foreground leading-none mb-1">Experience</p>
                <p className="text-sm font-bold leading-none">{worker.experienceYears} <span className="text-[10px] font-normal text-muted-foreground">yrs</span></p>
              </div>
              <div className="flex-1 px-3 py-2.5 text-center">
                <p className="text-[10px] text-muted-foreground leading-none mb-1">Attendance</p>
                <p className={`text-sm font-bold leading-none ${attendanceRateTone(worker.attendanceRate)}`}>
                  {worker.attendanceRate === null ? '—' : `${worker.attendanceRate}%`}
                </p>
              </div>
              <div className="flex-1 px-3 py-2.5 text-center">
                <p className="text-[10px] text-muted-foreground leading-none mb-1">PPE</p>
                <p className={`text-sm font-bold leading-none ${worker.ppeCompliant ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {worker.ppeCompliant ? 'OK' : 'Flag'}
                </p>
              </div>
              <div className="flex-1 px-3 py-2.5 text-center">
                <p className="text-[10px] text-muted-foreground leading-none mb-1">Certs</p>
                <p className="text-sm font-bold leading-none">{worker.certifications.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5 space-y-5">
            {/* Contact & Assignment */}
            <div className="grid grid-cols-2 gap-2.5">
              <a href={worker.phone ? `tel:${worker.phone}` : undefined} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
                <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Phone className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Phone</p>
                  <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{worker.phone ?? '—'}</p>
                </div>
              </a>

              <a href={worker.email ? `mailto:${worker.email}` : undefined} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
                <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                  <Mail className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Email</p>
                  <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{worker.email ?? '—'}</p>
                </div>
              </a>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Project</p>
                  <p className="text-xs font-medium truncate">{worker.project ?? 'Not assigned'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50">
                <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground">Supervisor</p>
                  <p className="text-xs font-medium truncate">{worker.supervisor ?? '-'}</p>
                </div>
              </div>
            </div>

            <WorkerAttendanceCard worker={worker} />

            {/* Skills */}
            <div className="rounded-xl border bg-card p-4">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <Star className="h-4 w-4 text-muted-foreground" />
                Skills
                <span className="ml-auto text-xs text-muted-foreground font-normal">{worker.experienceYears} yrs exp</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {worker.skills.length === 0 && <span className="text-xs text-muted-foreground">No skills recorded.</span>}
                {worker.skills.map((skill) => (
                  <span key={skill} className="text-xs bg-secondary px-2.5 py-1 rounded-lg text-secondary-foreground font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Certifications */}
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  Certifications
                </h4>
                {worker.ppeCompliant ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5" /> PPE OK
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-red-600 dark:text-red-400 font-medium">
                    <ShieldAlert className="h-3.5 w-3.5" /> PPE Flag
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {worker.certifications.length === 0 && <p className="text-xs text-muted-foreground">No certifications on file.</p>}
                {worker.certifications.map((cert, i) => {
                  const cfg = CERT_STATUS_CONFIG[cert.status];
                  return (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40">
                      <div className={`w-1 self-stretch rounded-full ${cfg.bar}`} />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {cfg.icon}
                        <span className="text-xs font-medium truncate">{cert.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[10px] font-semibold ${cfg.text}`}>{cfg.label.toUpperCase()}</p>
                        <p className="text-[10px] text-muted-foreground">{cert.expiryDate.slice(0, 7)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="rounded-xl border bg-card p-4">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Emergency Contact
              </h4>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {worker.emergencyContact?.name ?? '—'}
                    {worker.emergencyContact?.relation && (
                      <span className="text-xs text-muted-foreground font-normal ml-1.5">({worker.emergencyContact.relation})</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{worker.emergencyContact?.phone ?? '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* ── Sticky Footer ── */}
        <div className="shrink-0 border-t bg-background px-5 py-3 flex gap-2">
          <Button size="sm" className="flex-1 gap-1.5" onClick={() => setAssignOpen(true)} disabled={!worker.isActive}>
            <UserPlus className="h-3.5 w-3.5" /> {worker.projectId ? 'Reassign Project' : 'Assign Project'}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!worker.phone} onSelect={() => { window.location.href = `tel:${worker.phone}`; }}>
                <Phone className="mr-2 h-4 w-4" /> Call
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!worker.email} onSelect={() => { window.location.href = `mailto:${worker.email}`; }}>
                <Mail className="mr-2 h-4 w-4" /> Email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={setWorkerActive.isPending}
                className={worker.isActive ? 'text-destructive focus:text-destructive' : undefined}
                onSelect={() => toggleActive(worker)}
              >
                {worker.isActive
                  ? <><UserX className="mr-2 h-4 w-4" /> Deactivate worker</>
                  : <><UserCheck className="mr-2 h-4 w-4" /> Reactivate worker</>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <AssignProjectDialog worker={worker} open={assignOpen} onOpenChange={setAssignOpen} />
        <WorkerFormDialog worker={worker} open={editOpen} onOpenChange={setEditOpen} />
      </SheetContent>
    </Sheet>
  );
}
