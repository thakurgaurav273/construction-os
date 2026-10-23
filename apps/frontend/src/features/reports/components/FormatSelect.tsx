'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sitepilot/ui';
import { FORMAT_LABELS } from '../report-presentation';
import type { ReportFormat } from '../types';

const FORMATS = Object.keys(FORMAT_LABELS) as ReportFormat[];

interface FormatSelectProps {
  id: string;
  value: ReportFormat;
  onChange: (format: ReportFormat) => void;
}

export function FormatSelect({ id, value, onChange }: FormatSelectProps): React.ReactElement {
  return (
    <Select value={value} onValueChange={(next) => onChange(FORMATS.find((format) => format === next) ?? 'PDF')}>
      <SelectTrigger id={id}><SelectValue /></SelectTrigger>
      <SelectContent>
        {FORMATS.map((format) => <SelectItem key={format} value={format}>{FORMAT_LABELS[format]}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
