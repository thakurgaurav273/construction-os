import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  multipart, sheetForm, type ExistingRecordPolicy, type ImportEntityDefinition, type ImportTemplate, type SheetAnalysis, type TemplateInput,
} from '@/hooks/api/use-data-import';
import type { BoqImportResult, MeasurementImportResult } from '@/features/billing/import-types';

function unwrap<T>(res: { data: { data?: T } & T }): T {
  return res.data.data ?? res.data;
}

/** Where a billing sheet lands: a contract's BOQ or an RA bill's measurement book. */
export type BillingSheetTarget = { kind: 'boq'; contractId: string } | { kind: 'measurements'; billId: string };

function basePath(target: BillingSheetTarget): string {
  return target.kind === 'boq' ? `/contracts/${target.contractId}/boq-import` : `/ra-bills/${target.billId}/measurement-import`;
}

/** BOQ and measurement book fields; readable by anyone who can see billing. */
export function useBillingImportDefinitions() {
  return useQuery<ImportEntityDefinition[]>({
    queryKey: ['billing', 'import-definitions'],
    queryFn: async () => unwrap(await apiClient.get('/billing-import/definitions')),
    staleTime: Infinity,
  });
}

export function useAnalyzeBillingSheet(target: BillingSheetTarget) {
  return useMutation({
    mutationFn: async ({ file, ...fields }: { file: File; sheetName?: string; headerRow?: number }): Promise<SheetAnalysis> =>
      unwrap(await apiClient.post(`${basePath(target)}/analyze`, sheetForm(file, fields), multipart)),
  });
}

/** Layouts are saved through the billing route, which checks the billing permission instead of `data.import`. */
export function useSaveBillingLayout(target: BillingSheetTarget) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, id }: { input: TemplateInput; id?: string }): Promise<ImportTemplate> => {
      const { name, headerRow, headers, mapping } = input;
      const body = { name, headerRow, headers, mapping };
      return unwrap(id ? await apiClient.put(`${basePath(target)}/layouts/${id}`, body) : await apiClient.post(`${basePath(target)}/layouts`, body));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['imports'] }),
  });
}

export interface BoqImportInput {
  file: File;
  templateId: string;
  sheetName?: string;
  onExisting: ExistingRecordPolicy;
  lastBillNumber?: number;
}

function useBillingRun<TInput, TResult>(request: (input: TInput) => Promise<TResult>, writes: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      if (writes) queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });
}

export function useBoqImport(contractId: string, mode: 'preview' | 'commit') {
  const path = mode === 'preview' ? `/contracts/${contractId}/boq-import/preview` : `/contracts/${contractId}/boq-import`;
  return useBillingRun(async ({ file, ...fields }: BoqImportInput): Promise<BoqImportResult> =>
    unwrap(await apiClient.post(path, sheetForm(file, fields), multipart)), mode === 'commit');
}

export interface MeasurementImportInput {
  file: File;
  templateId: string;
  sheetName?: string;
  /** Omit to import every section. */
  sections?: string[];
}

export function useMeasurementImport(billId: string, mode: 'preview' | 'commit') {
  const path = mode === 'preview' ? `/ra-bills/${billId}/measurement-import/preview` : `/ra-bills/${billId}/measurement-import`;
  return useBillingRun(async ({ file, sections, ...fields }: MeasurementImportInput): Promise<MeasurementImportResult> =>
    unwrap(await apiClient.post(path, sheetForm(file, { ...fields, sections: sections ? JSON.stringify(sections) : undefined }), multipart)), mode === 'commit');
}

/** Downloads the bill as an .xlsx (Abstract + Measurement Book). */
export function useExportBill() {
  return useMutation({
    mutationFn: async (billId: string): Promise<string> => {
      const { fileName, contentBase64 } = unwrap<{ fileName: string; contentBase64: string }>(await apiClient.get(`/ra-bills/${billId}/export`));
      const bytes = Uint8Array.from(atob(contentBase64), (char) => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      return fileName;
    },
  });
}
