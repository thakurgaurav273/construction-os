'use client';

import { useRef, useState, type DragEvent } from 'react';
import { UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle, cn } from '@sitepilot/ui';
import type { DailyReportAttachment } from '@/hooks/api/use-daily-reports';
import { ALLOWED_ATTACHMENT_TYPES, ATTACHMENT_ACCEPT, MAX_ATTACHMENT_SIZE_BYTES } from '../constants';
import { ReportAttachmentList, formatFileSize } from './ReportAttachmentList';

interface ReportAttachmentsCardProps {
  projectId: string;
  reportId?: string;
  attachments: DailyReportAttachment[];
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
}

/** Collects photos before save; files are uploaded once the report exists (see DailyReportForm). */
export function ReportAttachmentsCard({
  projectId,
  reportId,
  attachments,
  pendingFiles,
  onPendingFilesChange,
}: ReportAttachmentsCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function addFiles(fileList: FileList | null): void {
    const files = Array.from(fileList ?? []);
    const accepted = files.filter((file) => {
      if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
        toast.error(`${file.name}: attach JPG, PNG, WEBP, HEIC or PDF files only.`);
        return false;
      }
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        toast.error(`${file.name} is larger than ${formatFileSize(MAX_ATTACHMENT_SIZE_BYTES)}.`);
        return false;
      }
      return true;
    });
    if (accepted.length > 0) onPendingFilesChange([...pendingFiles, ...accepted]);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <UploadCloud className="mr-2 h-5 w-5 text-muted-foreground" /> Photos & Attachments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label
          htmlFor="report-attachments"
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring',
            isDragging && 'bg-muted/50 border-primary',
          )}
        >
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <UploadCloud className="h-6 w-6" />
          </div>
          <span className="font-semibold mb-1">Upload site photos</span>
          <span className="text-sm text-muted-foreground max-w-sm">
            Drag and drop, or click to browse. JPG, PNG, WEBP, HEIC or PDF up to {formatFileSize(MAX_ATTACHMENT_SIZE_BYTES)}.
          </span>
          <input
            ref={inputRef}
            id="report-attachments"
            type="file"
            multiple
            accept={ATTACHMENT_ACCEPT}
            className="sr-only"
            onChange={(event) => addFiles(event.target.files)}
          />
        </label>

        {pendingFiles.length > 0 && (
          <ul className="divide-y rounded-md border border-dashed">
            {pendingFiles.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">Uploads on save · {formatFileSize(file.size)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => onPendingFilesChange(pendingFiles.filter((_, fileIndex) => fileIndex !== index))}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {reportId && (
          <ReportAttachmentList projectId={projectId} reportId={reportId} attachments={attachments} canRemove />
        )}
      </CardContent>
    </Card>
  );
}
