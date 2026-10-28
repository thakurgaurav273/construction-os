'use client';

import React, { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, cn } from '@sitepilot/ui';
import { AlertTriangle, Check, LayoutDashboard, RotateCcw } from 'lucide-react';
import { FormField } from '@/components/shared/FormField';
import { useUpdateBranding, type OrganizationSettings } from '@/hooks/api/use-settings';
import { getApiErrorMessage } from '@/lib/api/errors';
import { BRAND_PRESETS, HEX_COLOR, MIN_BRAND_CONTRAST, brandTokens, contrastRatio } from '@/lib/brand-color';

const schema = z.object({
  brandColor: z.string().trim().regex(HEX_COLOR, 'Use a hex colour like #1D4ED8'),
});

type Values = z.infer<typeof schema>;

const DEFAULT_COLOR = '#18181B';

type PreviewVars = React.CSSProperties & Record<'--primary' | '--primary-foreground' | '--ring', string>;

/** A small slice of the app (button, link, badge, active nav item) drawn with the chosen colour. */
function Preview({ hex, dark }: { hex: string; dark: boolean }): React.ReactElement {
  const tokens = brandTokens(hex);
  const theme = dark ? tokens.dark : tokens.light;
  const vars: PreviewVars = { '--primary': theme.primary, '--primary-foreground': theme.primaryForeground, '--ring': theme.primary };
  return (
    <div className={cn(dark && 'dark')}>
      <div style={vars} className="space-y-3 rounded-lg border bg-background p-4 text-foreground">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{dark ? 'Dark mode' : 'Light mode'}</p>
        <div className="flex items-center gap-2 rounded-md bg-muted/60 px-2 py-1.5 text-sm">
          <span className="h-4 w-0.5 rounded-full bg-primary" />
          <LayoutDashboard className="h-4 w-4 text-primary" /> <span className="font-medium">Projects</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" type="button">New Purchase Order</Button>
          <Button size="sm" type="button" variant="outline">Cancel</Button>
          <Badge>Approved</Badge>
        </div>
        <p className="text-sm">Pending: <span className="font-medium text-primary underline-offset-2 hover:underline">PO-0014</span> needs your approval.</p>
      </div>
    </div>
  );
}

export function BrandColorCard({ organization, canManage }: { organization: OrganizationSettings; canManage: boolean }): React.ReactElement {
  const updateBranding = useUpdateBranding();
  const saved = organization.brandColor ?? DEFAULT_COLOR;
  const { register, control, handleSubmit, reset, setValue, formState: { errors, isSubmitting, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { brandColor: saved },
  });
  const draft = useWatch({ control, name: 'brandColor' });
  const valid = HEX_COLOR.test(draft ?? '');
  const contrast = valid ? contrastRatio(draft, '#FFFFFF') : 0;
  const tooLight = valid && contrast < MIN_BRAND_CONTRAST;

  useEffect(() => {
    reset({ brandColor: organization.brandColor ?? DEFAULT_COLOR });
  }, [organization.brandColor, reset]);

  async function save(values: Values): Promise<void> {
    if (tooLight) return;
    try {
      // The default graphite is stored as "no brand colour" so it keeps following future default theme updates.
      const color = values.brandColor.toUpperCase() === DEFAULT_COLOR ? null : values.brandColor.toUpperCase();
      await updateBranding.mutateAsync(color);
      toast.success(color ? 'Brand colour applied for everyone' : 'Default theme restored');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t save the brand colour. Try again.'));
    }
  }

  function pick(hex: string): void {
    setValue('brandColor', hex, { shouldDirty: true, shouldValidate: true });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand colour</CardTitle>
        <CardDescription>Used for buttons, links, highlights and the active menu item, for everyone in {organization.name}. Dark mode gets a lighter shade automatically.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(save)} className="space-y-5" noValidate>
          <fieldset disabled={!canManage} className="space-y-5">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Preset colours">
              {BRAND_PRESETS.map((preset) => {
                const selected = draft?.toUpperCase() === preset.hex.toUpperCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={preset.name}
                    title={preset.name}
                    onClick={() => pick(preset.hex)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:hover:scale-100',
                      selected ? 'border-foreground' : 'border-transparent',
                    )}
                    style={{ backgroundColor: preset.hex }}
                  >
                    {selected && <Check className="h-4 w-4" style={{ color: brandTokens(preset.hex).lightForegroundHex }} />}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <FormField label="Custom colour" htmlFor="brand-hex" error={errors.brandColor?.message} className="w-40">
                <Input id="brand-hex" className="font-mono uppercase" maxLength={7} {...register('brandColor')} />
              </FormField>
              <input
                type="color"
                aria-label="Pick a custom colour"
                value={valid ? draft : DEFAULT_COLOR}
                onChange={(event) => pick(event.target.value.toUpperCase())}
                className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1 disabled:cursor-not-allowed"
              />
              {valid && (
                <p className={cn('flex items-center gap-1.5 pb-2 text-xs', tooLight ? 'text-destructive' : 'text-muted-foreground')}>
                  {tooLight && <AlertTriangle className="h-3.5 w-3.5" />}
                  Contrast on white {contrast.toFixed(1)}:1{tooLight ? ` — too light, needs ${MIN_BRAND_CONTRAST}:1` : ''}
                </p>
              )}
            </div>
          </fieldset>

          {valid && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Preview hex={draft} dark={false} />
              <Preview hex={draft} dark />
            </div>
          )}

          {canManage && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" disabled={isSubmitting || draft?.toUpperCase() === DEFAULT_COLOR} onClick={() => pick(DEFAULT_COLOR)}>
                <RotateCcw className="mr-1.5 h-4 w-4" /> Default theme
              </Button>
              <Button type="button" variant="outline" disabled={!isDirty || isSubmitting} onClick={() => reset({ brandColor: saved })}>Discard</Button>
              <Button type="submit" disabled={!isDirty || isSubmitting || tooLight}>{isSubmitting ? 'Saving…' : 'Save colour'}</Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
