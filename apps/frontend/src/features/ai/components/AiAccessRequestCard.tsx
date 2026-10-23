'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Textarea } from '@sitepilot/ui';
import { Gift } from 'lucide-react';
import { FormField } from '@/components/shared/FormField';
import { useCancelAiAccessRequest, useRequestAiAccess, type AiSettings } from '@/hooks/api/use-ai';
import { getApiErrorMessage } from '@/lib/api/errors';
import { accessRequestSchema, type AccessRequestValues } from '../validation/ai.schema';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
  CANCELLED: 'bg-muted text-muted-foreground',
};

/** Ask SitePilot for AI on the platform's key: a free trial first, then more requests when it runs low. */
export function AiAccessRequestCard({ settings }: { settings: AiSettings }): React.ReactElement {
  const requestAccess = useRequestAiAccess();
  const cancel = useCancelAiAccessRequest();
  const pending = settings.requests.find((request) => request.status === 'PENDING');
  const hadTrial = settings.requests.some((request) => request.kind === 'TRIAL' && request.status === 'APPROVED');
  const { allowance } = settings.status;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AccessRequestValues>({
    resolver: zodResolver(accessRequestSchema),
    defaultValues: { requestedRequests: 200, reason: '' },
  });

  async function submit(values: AccessRequestValues): Promise<void> {
    try {
      await requestAccess.mutateAsync({
        kind: hadTrial ? 'TOP_UP' : 'TRIAL',
        requestedRequests: hadTrial ? values.requestedRequests : undefined,
        reason: values.reason || undefined,
      });
      reset({ requestedRequests: 200, reason: '' });
      toast.success('Request sent', { description: 'You’ll get a notification when SitePilot reviews it.' });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t send the request. Try again.'));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-violet-500" /> {hadTrial ? 'More AI usage' : 'Free trial'}</CardTitle>
        <CardDescription>
          {hadTrial
            ? 'Running low? Ask SitePilot for more requests on our AI key, or add your own key above for unlimited use.'
            : `No API key yet? Try AI on SitePilot’s key: ${settings.trialDefaults.requests} requests for ${settings.trialDefaults.days} days, once approved.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {allowance.active && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <span className="font-medium">{allowance.remaining}</span> of {allowance.granted} requests left
            {allowance.expiresAt && <> · until {format(new Date(allowance.expiresAt), 'dd MMM yyyy')}</>}
          </div>
        )}

        {pending ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
            <span>
              Your {pending.kind === 'TRIAL' ? 'trial' : `request for ${pending.requestedRequests} more requests`} is waiting for SitePilot&apos;s approval
              (sent {format(new Date(pending.createdAt), 'dd MMM')}).
            </span>
            <Button size="sm" variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate(pending.id)}>Cancel request</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(submit)} className="space-y-3" noValidate>
            {hadTrial && (
              <FormField label="Requests needed" htmlFor="ai-requests" error={errors.requestedRequests?.message} className="max-w-[200px]">
                <Input id="ai-requests" type="number" min={10} max={10000} {...register('requestedRequests')} />
              </FormField>
            )}
            <FormField label="What will you use it for? (optional)" htmlFor="ai-reason" error={errors.reason?.message}>
              <Textarea id="ai-reason" rows={2} placeholder="e.g. Daily report summaries for 3 sites" {...register('reason')} />
            </FormField>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : hadTrial ? 'Request more usage' : 'Request free trial'}</Button>
          </form>
        )}

        {settings.requests.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">History</p>
            <ul className="space-y-2">
              {settings.requests.map((request) => (
                <li key={request.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge className={STATUS_STYLES[request.status]} variant="outline">{request.status.toLowerCase()}</Badge>
                  <span>{request.kind === 'TRIAL' ? 'Free trial' : `${request.requestedRequests} more requests`}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(request.createdAt), 'dd MMM yyyy')}</span>
                  {request.status === 'APPROVED' && request.grantedRequests != null && (
                    <span className="text-xs text-muted-foreground">· {request.grantedRequests} granted</span>
                  )}
                  {request.decisionNote && <span className="w-full pl-1 text-xs text-muted-foreground">&ldquo;{request.decisionNote}&rdquo;</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
