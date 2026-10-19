'use client';

import type { ReactNode } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { AlertTriangle, Hammer, Plus, Trash2, Truck, type LucideIcon } from 'lucide-react';
import {
  Button, Card, CardContent, CardHeader, CardTitle, Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { ISSUE_SEVERITY_OPTIONS, MAX_LINE_ITEMS } from '../constants';
import type { DailyReportFormValues } from '../validation/daily-report.schema';
import { FieldError } from './ReportDetailsFields';

interface LineItemsCardProps {
  icon: LucideIcon;
  title: string;
  addLabel: string;
  emptyText: string;
  itemCount: number;
  onAdd: () => void;
  children: ReactNode;
}

function LineItemsCard({ icon: Icon, title, addLabel, emptyText, itemCount, onAdd, children }: LineItemsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Icon className="mr-2 h-5 w-5 text-muted-foreground" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {itemCount === 0 && <p className="text-sm text-muted-foreground">{emptyText}</p>}
        {children}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onAdd}
          disabled={itemCount >= MAX_LINE_ITEMS}
        >
          <Plus className="mr-2 h-4 w-4" /> {addLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function RemoveRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label={label} onClick={onClick}>
      <Trash2 className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}

export function MaterialsCard() {
  const { control, register, formState: { errors } } = useFormContext<DailyReportFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'materials' });

  return (
    <LineItemsCard
      icon={Hammer}
      title="Materials Used"
      addLabel="Add Material"
      emptyText="No materials recorded for today."
      itemCount={fields.length}
      onAdd={() => append({ material: '', quantity: 0, unit: '' })}
    >
      {fields.map((field, index) => {
        const rowErrors = errors.materials?.[index];
        return (
          <div key={field.id} className="space-y-1">
            <div className="flex gap-2">
              <Input aria-label="Material" placeholder="Material" {...register(`materials.${index}.material`)} />
              <Input
                aria-label="Quantity"
                placeholder="Qty"
                type="number"
                step="any"
                min={0}
                className="w-24"
                {...register(`materials.${index}.quantity`)}
              />
              <Input aria-label="Unit" placeholder="Unit" className="w-20" {...register(`materials.${index}.unit`)} />
              <RemoveRowButton label={`Remove material ${index + 1}`} onClick={() => remove(index)} />
            </div>
            <FieldError
              message={rowErrors?.material?.message ?? rowErrors?.quantity?.message ?? rowErrors?.unit?.message}
            />
          </div>
        );
      })}
    </LineItemsCard>
  );
}

export function EquipmentCard() {
  const { control, register, formState: { errors } } = useFormContext<DailyReportFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'equipment' });

  return (
    <LineItemsCard
      icon={Truck}
      title="Equipment"
      addLabel="Add Equipment"
      emptyText="No equipment recorded for today."
      itemCount={fields.length}
      onAdd={() => append({ name: '', hours: 0 })}
    >
      {fields.map((field, index) => {
        const rowErrors = errors.equipment?.[index];
        return (
          <div key={field.id} className="space-y-1">
            <div className="flex gap-2">
              <Input aria-label="Equipment" placeholder="Equipment" {...register(`equipment.${index}.name`)} />
              <Input
                aria-label="Hours used"
                placeholder="Hrs"
                type="number"
                step="0.5"
                min={0}
                max={24}
                className="w-24"
                {...register(`equipment.${index}.hours`)}
              />
              <RemoveRowButton label={`Remove equipment ${index + 1}`} onClick={() => remove(index)} />
            </div>
            <FieldError message={rowErrors?.name?.message ?? rowErrors?.hours?.message} />
          </div>
        );
      })}
    </LineItemsCard>
  );
}

export function IssuesCard() {
  const { control, register, formState: { errors } } = useFormContext<DailyReportFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'issues' });

  return (
    <LineItemsCard
      icon={AlertTriangle}
      title="Issues & Safety Observations"
      addLabel="Add Issue"
      emptyText="No issues, delays or safety observations today."
      itemCount={fields.length}
      onAdd={() => append({ severity: 'minor', description: '' })}
    >
      {fields.map((field, index) => (
        <div key={field.id} className="space-y-1">
          <div className="flex gap-2">
            <Controller
              control={control}
              name={`issues.${index}.severity`}
              render={({ field: severityField }) => (
                <Select value={severityField.value} onValueChange={severityField.onChange}>
                  <SelectTrigger className="w-32 shrink-0" aria-label="Severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_SEVERITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Input
              aria-label="Issue description"
              placeholder="Delay, incident, hazard or quality concern"
              {...register(`issues.${index}.description`)}
            />
            <RemoveRowButton label={`Remove issue ${index + 1}`} onClick={() => remove(index)} />
          </div>
          <FieldError message={errors.issues?.[index]?.description?.message} />
        </div>
      ))}
    </LineItemsCard>
  );
}
