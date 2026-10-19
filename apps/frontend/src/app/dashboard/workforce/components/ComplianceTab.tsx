'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Progress } from '@sitepilot/ui';
import {
  AlertTriangle, ShieldAlert, ShieldCheck, Award,
  CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react';
import type { Worker } from '@/hooks/api/use-workforce';

interface ComplianceItem {
  workerId: string;
  workerName: string;
  role: string;
  project: string;
  certName: string;
  expiryDate: string;
  severity: 'critical' | 'high' | 'medium';
  type: 'expired' | 'expiring';
}

const SEVERITY_COLORS = {
  critical: 'border-red-200 bg-red-50 dark:border-red-800/30 dark:bg-red-900/10',
  high:     'border-orange-200 bg-orange-50 dark:border-orange-800/30 dark:bg-orange-900/10',
  medium:   'border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-900/10',
};

const SEVERITY_BADGE_COLORS = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

interface ComplianceTabProps {
  workers: Worker[];
}

export function ComplianceTab({ workers }: ComplianceTabProps): React.ReactElement {
  const nonPpeWorkers = useMemo(
    () => workers.filter((w) => !w.ppeCompliant),
    [workers],
  );

  const certIssues = useMemo((): ComplianceItem[] => {
    const issues: ComplianceItem[] = [];
    workers.forEach((w: Worker) => {
      w.certifications.forEach((cert) => {
        if (cert.status === 'expired') {
          issues.push({
            workerId: w.id,
            workerName: w.name,
            role: w.role,
            project: w.project ?? '',
            certName: cert.name,
            expiryDate: cert.expiryDate,
            severity: !w.ppeCompliant ? 'critical' : 'high',
            type: 'expired',
          });
        } else if (cert.status === 'expiring') {
          issues.push({
            workerId: w.id,
            workerName: w.name,
            role: w.role,
            project: w.project ?? '',
            certName: cert.name,
            expiryDate: cert.expiryDate,
            severity: 'medium',
            type: 'expiring',
          });
        }
      });
    });
    // sort: expired first, then by severity
    return issues.sort((a, b) => {
      if (a.type === 'expired' && b.type !== 'expired') return -1;
      if (a.type !== 'expired' && b.type === 'expired') return 1;
      return 0;
    });
  }, [workers]);

  const expiredCount  = certIssues.filter((c) => c.type === 'expired').length;
  const expiringCount = certIssues.filter((c) => c.type === 'expiring').length;
  const totalWorkers  = workers.length;
  const compliantPct  = Math.round(((totalWorkers - nonPpeWorkers.length) / totalWorkers) * 100);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Overall Compliance</span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{compliantPct}%</p>
            <Progress value={compliantPct} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Expired Certs</span>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Require immediate renewal</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Expiring Soon</span>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{expiringCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Within 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">PPE Non-Compliant</span>
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">{nonPpeWorkers.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Workers flagged</p>
          </CardContent>
        </Card>
      </div>

      {/* Certification Issues Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Certification Issues
          </CardTitle>
          <CardDescription>
            {expiredCount} expired · {expiringCount} expiring within 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {certIssues.map((issue, idx) => (
              <div
                key={`${issue.workerId}-${idx}`}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border ${SEVERITY_COLORS[issue.severity]}`}
              >
                <div className="flex items-start gap-3">
                  {issue.type === 'expired'
                    ? <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    : <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  }
                  <div>
                    <p className="text-sm font-medium">{issue.workerName}
                      <span className="text-xs text-muted-foreground ml-1.5">- {issue.role}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{issue.certName}</p>
                    <p className="text-xs text-muted-foreground">{issue.project}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${SEVERITY_BADGE_COLORS[issue.severity]}`}>
                    {issue.type === 'expired' ? 'EXPIRED' : 'EXPIRING'}
                  </span>
                  <span className="text-xs text-muted-foreground">{issue.expiryDate}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* PPE Non-Compliance */}
      {nonPpeWorkers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              PPE Non-Compliance
            </CardTitle>
            <CardDescription>Workers without valid PPE compliance certification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nonPpeWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 dark:border-red-800/30 dark:bg-red-900/10"
                >
                  <div className="flex items-center gap-3">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{worker.name}</p>
                      <p className="text-xs text-muted-foreground">{worker.role} · {worker.project}</p>
                    </div>
                  </div>
                  <Badge className="text-xs bg-red-100 text-red-700 border-0 dark:bg-red-900/30 dark:text-red-400">
                    Non-Compliant
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workers with Full Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Compliance Status Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm">Fully compliant</span>
              </div>
              <span className="text-sm font-semibold">{totalWorkers - nonPpeWorkers.length} workers</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-sm">Certifications expiring</span>
              </div>
              <span className="text-sm font-semibold">{workers.filter((w) => w.certifications.some((c) => c.status === 'expiring')).length} workers</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-sm">PPE non-compliant / expired certs</span>
              </div>
              <span className="text-sm font-semibold">{nonPpeWorkers.length} workers</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
