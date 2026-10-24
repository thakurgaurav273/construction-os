'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { Info, Sparkles } from 'lucide-react';
import { FormField } from '@/components/shared/FormField';
import {
  useSaveImportTemplate, type ImportEntityDefinition, type ImportMapping, type ImportTemplate, type SheetAnalysis,
} from '@/hooks/api/use-data-import';
import { getApiErrorMessage } from '@/lib/api/errors';
import {
  buildTemplateSchema, toImportMapping, toTemplateFormValues, type TemplateFormValues,
} from '../validation/import-template.schema';
import { MappingFieldRow } from './MappingFieldRow';
import { ExtraColumnsPicker, ValueTranslations } from './MappingExtras';

const EMPTY_MAPPING: ImportMapping = { columns: {}, defaults: {}, values: {}, extras: [] };

interface ColumnMappingStepProps {
  definition: ImportEntityDefinition;
  analysis: SheetAnalysis;
  fileName: string;
  /** The saved layout being edited, if any. */
  template: ImportTemplate | null;
  rereading: boolean;
  onReread: (options: { sheetName?: string; headerRow?: number }) => void;
  onSaved: (template: ImportTemplate) => void;
  onBack: () => void;
}

export function ColumnMappingStep({
  definition, analysis, fileName, template, rereading, onReread, onSaved, onBack,
}: ColumnMappingStepProps): React.ReactElement {
  const saveTemplate = useSaveImportTemplate();
  const startingMapping = template?.mapping ?? analysis.suggestion?.mapping ?? EMPTY_MAPPING;
  const defaultName = template?.name ?? fileName.replace(/\.[^.]+$/, '');
  const schema = useMemo(() => buildTemplateSchema(definition.fields), [definition.fields]);
  const [translations, setTranslations] = useState(startingMapping.values);
  const [headerRowInput, setHeaderRowInput] = useState(String(analysis.headerRow));

  const { control, register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<TemplateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toTemplateFormValues(definition.fields, startingMapping, defaultName),
  });

  // A re-read sheet (other tab or header row) brings new headings and a fresh suggestion.
  useEffect(() => {
    reset(toTemplateFormValues(definition.fields, startingMapping, defaultName));
    setTranslations(startingMapping.values);
    setHeaderRowInput(String(analysis.headerRow));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new analysis should reset the form
  }, [analysis]);

  const columns = useWatch({ control, name: 'columns' });
  const extras = useWatch({ control, name: 'extras' });
  const mappedHeadings = new Set(Object.values(columns).filter(Boolean));

  function sampleFor(heading: string): string | null {
    const index = analysis.headers.indexOf(heading);
    return analysis.sampleRows.map((row) => row[index]).find((value) => value) ?? null;
  }

  async function onSubmit(values: TemplateFormValues): Promise<void> {
    const input = {
      name: values.name,
      entity: definition.entity,
      headerRow: analysis.headerRow,
      headers: analysis.headers,
      mapping: toImportMapping(values, translations),
    };
    try {
      const saved = await saveTemplate.mutateAsync({ id: template?.id, input });
      toast.success(`Saved the “${saved.name}” layout`);
      onSaved(saved);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t save the layout. Try again.'));
    }
  }

  const suggestion = analysis.suggestion;
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Match your columns</CardTitle>
          <CardDescription>
            Tell SitePilot which column holds what. This is saved as a layout, so later sheets in the same format skip this step.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {suggestion && (
            <div className="flex gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
              {suggestion.source === 'ai'
                ? <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                : <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
              <p>{suggestion.source === 'ai' ? 'AI suggested these matches from your headings and first few rows. Check them before saving.' : suggestion.note}</p>
            </div>
          )}
          <div className="flex flex-wrap items-end gap-4">
            {analysis.sheetNames.length > 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="sheet-name">Sheet</Label>
                <Select value={analysis.sheetName} onValueChange={(sheetName) => onReread({ sheetName })} disabled={rereading}>
                  <SelectTrigger id="sheet-name" className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {analysis.sheetNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="header-row">Headings are in row</Label>
              <div className="flex gap-2">
                <Input
                  id="header-row"
                  type="number"
                  min={1}
                  max={50}
                  className="w-20"
                  value={headerRowInput}
                  onChange={(event) => setHeaderRowInput(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={rereading || Number(headerRowInput) === analysis.headerRow || !(Number(headerRowInput) >= 1)}
                  onClick={() => onReread({ sheetName: analysis.sheetName, headerRow: Number(headerRowInput) })}
                >
                  {rereading ? 'Reading…' : 'Re-read'}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{analysis.totalRows} data rows found</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-2">
          {definition.fields.map((field) => (
            <MappingFieldRow
              key={field.key}
              field={field}
              headers={analysis.headers}
              control={control}
              register={register}
              selectedColumn={columns[field.key] ?? ''}
              sample={columns[field.key] ? sampleFor(columns[field.key]) : null}
              error={errors.columns?.[field.key]?.message ?? errors.defaults?.[field.key]?.message}
            />
          ))}
        </CardContent>
      </Card>

      {/* Hidden when the sheet needs neither extra columns nor translations. */}
      <Card className="space-y-6 p-6 empty:hidden">
        {definition.keepsExtraColumns && (
          <ExtraColumnsPicker
            available={analysis.headers.filter((heading) => !mappedHeadings.has(heading))}
            selected={extras.filter((heading) => !mappedHeadings.has(heading))}
            onChange={(selected) => setValue('extras', selected)}
          />
        )}
        <ValueTranslations
          fields={definition.fields}
          columns={columns}
          columnValues={analysis.columnValues}
          translations={translations}
          onChange={setTranslations}
        />
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end">
          <FormField label="Layout name" htmlFor="template-name" error={errors.name?.message} className="flex-1">
            <Input id="template-name" {...register('name')} placeholder="e.g. Head office material register" />
          </FormField>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onBack}>Back</Button>
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting || rereading}>Save layout &amp; review</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
