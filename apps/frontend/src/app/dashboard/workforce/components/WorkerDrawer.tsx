'use client';

import React from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  Badge, Button, Progress, ScrollArea, Separator,
  Avatar, AvatarFallback,
} from '@sitepilot/ui';
import {
  Phone, Mail, MapPin, Award, ShieldCheck, ShieldAlert,
  Clock, Briefcase, User, AlertTriangle, CheckCircle2,
  MessageSquare, FolderOpen, UserPlus, Calendar,
} from 'lucide-react';
import { Worker, CertStatus, WorkerStatus } from '@/data/workforce-demo';

interface WorkerDrawerProps {
  worker: Worker | null;
  open: boolean;
  onClose: () => void;
}

const STATUS_LABELS: Record<WorkerStatus, string> = {
  active: 'Present',
  late: 'Late',
  absent: 'Absent',
  on_leave: 'On Leave',
};

const STATUS_COLORS: Record<WorkerStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  late: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  absent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  on_leave: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const CERT_COLORS: Record<CertStatus, string> = {
  valid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  expiring: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const CERT_ICONS: Record<CertStatus, React.ReactNode> = {
  valid: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  expiring: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  expired: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  checkin: <Clock className="h-3.5 w-3.5 text-blue-500" />,
  report: <FolderOpen className="h-3.5 w-3.5 text-violet-500" />,
  training: <Award className="h-3.5 w-3.5 text-amber-500" />,
  inspection: <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />,
  alert: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
  approval: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  assignment: <UserPlus className="h-3.5 w-3.5 text-blue-500" />,
  leave: <Calendar className="h-3.5 w-3.5 text-blue-500" />,
  general: <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />,
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-orange-500',
];

function getAvatarColor(workerId: string): string {
  const idx = parseInt(workerId.replace('w', ''), 10);
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

export function WorkerDrawer({ worker, open, onClose }: WorkerDrawerProps): React.ReactElement {
  if (!worker) return <></>;

  const presentDays = worker.weeklyAttendance.filter((d) => d.present).length;
  const lateDays = worker.weeklyAttendance.filter((d) => d.late).length;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle className="sr-only">Worker Profile</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          {/* Profile Header */}
          <div className="p-6 pb-4 flex items-start gap-4 border-b">
            <Avatar className={`h-16 w-16 shrink-0 ${getAvatarColor(worker.id)} text-white`}>
              <AvatarFallback className={`${getAvatarColor(worker.id)} text-white text-lg font-bold`}>
                {worker.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold truncate">{worker.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[worker.status]}`}>
                  {STATUS_LABELS[worker.status]}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{worker.role}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">{worker.trade}</Badge>
                <Badge variant="outline" className="text-xs">{worker.type}</Badge>
                <Badge variant="outline" className="text-xs">{worker.shift} Shift</Badge>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Contact & Assignment */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate text-muted-foreground">{worker.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate text-muted-foreground">{worker.email.split('@')[0]}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate text-muted-foreground">{worker.project}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate text-muted-foreground">{worker.supervisor}</span>
              </div>
            </div>

            <Separator />

            {/* Attendance Summary */}
            <div>
              <h4 className="text-sm font-semibold mb-3">This Week Attendance</h4>
              <div className="flex gap-2 mb-3">
                {worker.weeklyAttendance.map((day) => (
                  <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-full h-8 rounded-md flex items-center justify-center text-xs font-medium transition-all ${
                      !day.present
                        ? 'bg-muted text-muted-foreground'
                        : day.late
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    }`}>
                      {!day.present ? '–' : day.late ? 'L' : '✓'}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{day.day}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Overall Attendance</span>
                    <span className="font-medium">{worker.attendancePercent}%</span>
                  </div>
                  <Progress value={worker.attendancePercent} className="h-1.5" />
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  <p>{presentDays} present</p>
                  {lateDays > 0 && <p className="text-amber-600">{lateDays} late</p>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Last check-in: {worker.lastCheckIn}
              </p>
            </div>

            <Separator />

            {/* Skills */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Skills and Experience</h4>
              <p className="text-xs text-muted-foreground mb-2">{worker.experienceYears} years of experience</p>
              <div className="flex flex-wrap gap-1.5">
                {worker.skills.map((skill) => (
                  <span key={skill} className="text-xs bg-secondary px-2 py-0.5 rounded-md text-secondary-foreground">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <Separator />

            {/* Certifications */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Certifications</h4>
                {!worker.ppeCompliant && (
                  <span className="flex items-center gap-1 text-xs text-red-600">
                    <ShieldAlert className="h-3.5 w-3.5" /> PPE non-compliant
                  </span>
                )}
                {worker.ppeCompliant && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <ShieldCheck className="h-3.5 w-3.5" /> PPE compliant
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {worker.certifications.map((cert, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      {CERT_ICONS[cert.status]}
                      <span className="text-xs font-medium">{cert.name}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CERT_COLORS[cert.status]}`}>
                      {cert.status === 'valid' ? `Exp: ${cert.expiryDate.slice(0, 7)}` : cert.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Emergency Contact */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Emergency Contact</h4>
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm font-medium">{worker.emergencyContact.name}
                  <span className="text-xs text-muted-foreground ml-1">({worker.emergencyContact.relation})</span>
                </p>
                <p className="text-xs text-muted-foreground">{worker.emergencyContact.phone}</p>
              </div>
            </div>

            <Separator />

            {/* Recent Activity */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Recent Activity</h4>
              <div className="space-y-3">
                {worker.recentActivity.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-0.5">{ACTIVITY_ICONS[item.type] ?? ACTIVITY_ICONS['general']}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-relaxed">{item.action}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="flex-1">
                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Assign Project
              </Button>
              <Button size="sm" variant="outline">
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline">
                <FolderOpen className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
