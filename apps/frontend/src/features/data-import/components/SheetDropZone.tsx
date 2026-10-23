'use client';

import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button, cn } from '@sitepilot/ui';
import { FileSpreadsheet, Upload } from 'lucide-react';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['.xlsx', '.csv'];

interface SheetDropZoneProps {
  onFile: (file: File) => void;
  reading: boolean;
  disabled?: boolean;
  /** Shown when disabled, e.g. "First choose what the sheet contains." */
  disabledReason?: string;
}

/** Drag-and-drop or pick an .xlsx / .csv, checked for type and size before anything is uploaded. */
export function SheetDropZone({ onFile, reading, disabled = false, disabledReason }: SheetDropZoneProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function accept(file: File | undefined): void {
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.numbers')) {
      toast.error('Numbers files can’t be read directly. In Numbers, choose File → Export To → Excel, then upload the .xlsx.');
      return;
    }
    if (!ACCEPTED.some((extension) => file.name.toLowerCase().endsWith(extension))) {
      toast.error('Upload an Excel (.xlsx) or CSV file. Older .xls files can be saved as .xlsx from Excel.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('The file must be 5 MB or smaller. Split larger sheets into parts.');
      return;
    }
    if (disabled) {
      toast.error(disabledReason ?? 'This sheet can’t be uploaded yet.');
      return;
    }
    onFile(file);
  }

  return (
    <div
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        accept(event.dataTransfer.files[0]);
      }}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center transition-colors',
        dragging ? 'border-primary bg-primary/5' : 'bg-muted/20',
      )}
    >
      <FileSpreadsheet className="h-10 w-10 text-primary/40" />
      <p className="text-sm text-muted-foreground">Drag an Excel or CSV file here, or</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        aria-label="Choose spreadsheet"
        onChange={(event) => {
          accept(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <Button type="button" disabled={disabled || reading} loading={reading} onClick={() => inputRef.current?.click()}>
        <Upload className="mr-1.5 h-4 w-4" /> {reading ? 'Reading sheet…' : 'Choose file'}
      </Button>
      <p className="text-xs text-muted-foreground">.xlsx or .csv, up to 5 MB and 2,000 rows. Numbers files: export to Excel first.</p>
    </div>
  );
}
