import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Permission } from '@sitepilot/types';
import { apiClient } from '@/lib/api/client';
import { downloadCsv } from '@/lib/download-csv';

/** Must match ImportEntity on the backend. */
export type ImportEntity = 'MATERIAL' | 'VENDOR' | 'OPENING_STOCK' | 'PURCHASE_ORDER';
export type RowAction = 'create' | 'update' | 'skip' | 'error';
export type ExistingRecordPolicy = 'skip' | 'update';

export interface ImportField {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'number' | 'date' | 'list' | 'option';
  required: boolean;
  options?: string[];
}

export interface ImportEntityDefinition {
  entity: ImportEntity;
  label: string;
  permission: Permission;
  canUpdateExisting: boolean;
  keepsExtraColumns: boolean;
  fields: ImportField[];
  allowed: boolean;
}

export interface ImportMapping {
  columns: Record<string, string>;
  defaults: Record<string, string>;
  values: Record<string, Record<string, string>>;
  extras: string[];
}

export interface ImportTemplate {
  id: string;
  name: string;
  entity: ImportEntity;
  headerRow: number;
  headers: string[];
  mapping: ImportMapping;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MappingSuggestion {
  mapping: ImportMapping;
  source: 'ai' | 'name_match';
  note: string | null;
}

export interface SheetAnalysis {
  entity: ImportEntity;
  sheetNames: string[];
  sheetName: string;
  headerRow: number;
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
  /** Heading → its distinct values, for short-list columns only. */
  columnValues: Record<string, string[]>;
  template: ImportTemplate | null;
  suggestion: MappingSuggestion | null;
}

export interface RowOutcome {
  rowNumber: number;
  label: string;
  action: RowAction;
  messages: string[];
}

export interface ImportRun {
  id: string;
  entity: ImportEntity;
  sheetName: string;
  summary: Record<RowAction, number>;
  rows: RowOutcome[];
}

export interface TemplateInput {
  name: string;
  entity: ImportEntity;
  headerRow: number;
  headers: string[];
  mapping: ImportMapping;
}

interface ImportExport {
  fileName: string;
  headers: string[];
  rows: (string | number | null)[][];
}

const IMPORT_KEY = ['imports'] as const;

const unwrap = <T,>(res: { data: { data?: T } & T }): T => (res.data.data ?? res.data) as T;

function sheetForm(file: File, fields: Record<string, string | number | undefined>): FormData {
  const form = new FormData();
  form.append('file', file);
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== '') form.append(key, String(value));
  }
  return form;
}

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

export function useImportEntities() {
  return useQuery<ImportEntityDefinition[]>({
    queryKey: [...IMPORT_KEY, 'entities'],
    queryFn: async () => unwrap<ImportEntityDefinition[]>(await apiClient.get('/imports/entities')),
    staleTime: Infinity,
  });
}

export function useImportTemplates({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<ImportTemplate[]>({
    queryKey: [...IMPORT_KEY, 'templates'],
    queryFn: async () => unwrap<ImportTemplate[]>(await apiClient.get('/imports/templates')),
    enabled,
  });
}

export function useAnalyzeSheet() {
  return useMutation({
    mutationFn: async (input: { file: File; entity: ImportEntity; sheetName?: string; headerRow?: number }) => {
      const { file, ...fields } = input;
      return unwrap<SheetAnalysis>(await apiClient.post('/imports/analyze', sheetForm(file, fields), multipart));
    },
  });
}

export function useSaveImportTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: TemplateInput }) => {
      if (!id) return unwrap<ImportTemplate>(await apiClient.post('/imports/templates', input));
      // A template's entity is fixed once saved.
      const { name, headerRow, headers, mapping } = input;
      return unwrap<ImportTemplate>(await apiClient.put(`/imports/templates/${id}`, { name, headerRow, headers, mapping }));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...IMPORT_KEY, 'templates'] }),
  });
}

export function useDeleteImportTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap<{ id: string }>(await apiClient.delete(`/imports/templates/${id}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...IMPORT_KEY, 'templates'] }),
  });
}

export function usePreviewImport() {
  return useMutation({
    mutationFn: async (input: { templateId: string; file: File; sheetName?: string; onExisting: ExistingRecordPolicy }) => {
      const { templateId, file, ...fields } = input;
      return unwrap<ImportRun>(await apiClient.post(`/imports/templates/${templateId}/preview`, sheetForm(file, fields), multipart));
    },
  });
}

/** Imported records show up across Materials, Inventory and Procurement, so their caches are refreshed too. */
export function useRunImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { templateId: string; file: File; sheetName?: string; onExisting: ExistingRecordPolicy }) => {
      const { templateId, file, ...fields } = input;
      return unwrap<ImportRun>(await apiClient.post(`/imports/templates/${templateId}/import`, sheetForm(file, fields), multipart));
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

/** Downloads the organization's current records laid out in the template's own columns. */
export function useExportWithTemplate() {
  return useMutation({
    mutationFn: async (templateId: string) => {
      const data = unwrap<ImportExport>(await apiClient.get(`/imports/templates/${templateId}/export`));
      downloadCsv(data.fileName, data.headers, data.rows);
      return data.rows.length;
    },
  });
}
