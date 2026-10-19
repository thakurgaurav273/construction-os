'use client';

import { ExternalLink, FileText, ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@sitepilot/ui';
import { useDocumentDownloadUrl } from '@/hooks/api/use-documents';
import {
  useDeleteReportAttachment, type DailyReportAttachment,
} from '@/hooks/api/use-daily-reports';
import { getApiErrorMessage } from '@/lib/api/errors';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ReportAttachmentListProps {
  projectId: string;
  reportId: string;
  attachments: DailyReportAttachment[];
  canRemove?: boolean;
}

export function ReportAttachmentList({ projectId, reportId, attachments, canRemove = false }: ReportAttachmentListProps) {
  const downloadUrl = useDocumentDownloadUrl(projectId);
  const deleteAttachment = useDeleteReportAttachment(projectId);

  async function openAttachment(attachment: DailyReportAttachment): Promise<void> {
    try {
      const { url } = await downloadUrl.mutateAsync(attachment.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Couldn't open ${attachment.name}. Try again.`));
    }
  }

  async function removeAttachment(attachment: DailyReportAttachment): Promise<void> {
    try {
      await deleteAttachment.mutateAsync({ reportId, documentId: attachment.id });
      toast.success(`${attachment.name} removed`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Couldn't remove ${attachment.name}. Try again.`));
    }
  }

  if (attachments.length === 0) return null;

  return (
    <ul className="divide-y rounded-md border">
      {attachments.map((attachment) => {
        const Icon = attachment.mimeType.startsWith('image/') ? ImageIcon : FileText;
        return (
          <li key={attachment.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1 truncate">{attachment.name}</span>
            <span className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Open ${attachment.name}`}
              disabled={downloadUrl.isPending}
              onClick={() => openAttachment(attachment)}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            {canRemove && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${attachment.name}`}
                disabled={deleteAttachment.isPending}
                onClick={() => removeAttachment(attachment)}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
