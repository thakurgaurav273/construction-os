'use client';

import React, { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { Wand2 } from 'lucide-react';
import { useSaveItemLinks } from '@/hooks/api/use-billing';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { ItemLinkOptions } from '../../margin-types';
import type { ContractDetail } from '../../types';
import { formatAmount } from '../../utils/format';

/** Radix Select can't hold an empty value, so "not linked" uses a sentinel. */
const NOT_LINKED = 'none';

const linksSchema = z.object({ links: z.record(z.string()) });
type LinksFormValues = z.infer<typeof linksSchema>;

const toValues = (contract: ContractDetail): LinksFormValues => ({
  links: Object.fromEntries(contract.items.map((item) => [item.id, item.clientItemId ?? NOT_LINKED])),
});

interface ItemLinksFormProps {
  contract: ContractDetail;
  options: ItemLinkOptions;
}

export function ItemLinksForm({ contract, options }: ItemLinksFormProps): React.ReactElement {
  const router = useRouter();
  const saveLinks = useSaveItemLinks();
  const { control, handleSubmit, reset, setValue, formState: { isSubmitting, isDirty } } = useForm<LinksFormValues>({
    resolver: zodResolver(linksSchema),
    defaultValues: toValues(contract),
  });
  const links = useWatch({ control, name: 'links' });
  useEffect(() => { reset(toValues(contract)); }, [contract, reset]);

  const clientItems = new Map(options.clientContracts.flatMap((client) => client.items.map((item) => [item.id, item])));
  const pendingSuggestions = Object.entries(options.suggestions).filter(([itemId]) => (links?.[itemId] ?? NOT_LINKED) === NOT_LINKED);

  function applySuggestions(): void {
    pendingSuggestions.forEach(([itemId, clientItemId]) => setValue(`links.${itemId}`, clientItemId, { shouldDirty: true }));
    toast.success(`Filled ${pendingSuggestions.length} suggested ${pendingSuggestions.length === 1 ? 'link' : 'links'}. Check them, then save.`);
  }

  async function onSubmit(values: LinksFormValues): Promise<void> {
    try {
      await saveLinks.mutateAsync({
        contractId: contract.id,
        links: Object.entries(values.links).map(([itemId, clientItemId]) => ({ itemId, clientItemId: clientItemId === NOT_LINKED ? null : clientItemId })),
      });
      toast.success('Links saved');
      router.push(`/dashboard/billing/contracts/${contract.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t save the links. Try again.'));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Which client line does each item deliver?</CardTitle>
            <CardDescription>Margin per item compares what the client is billed with what this subcontractor is paid for the same work.</CardDescription>
          </div>
          {pendingSuggestions.length > 0 && (
            <Button type="button" variant="outline" onClick={applySuggestions}>
              <Wand2 className="mr-2 h-4 w-4" /> Use {pendingSuggestions.length} {pendingSuggestions.length === 1 ? 'suggestion' : 'suggestions'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-xl border">
            {contract.items.map((item) => {
              const linked = clientItems.get(links?.[item.id] ?? '');
              const suggestion = options.suggestions[item.id];
              return (
                <li key={item.id} className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.itemNo}{item.rateCode && <span className="ml-2 text-xs font-normal text-muted-foreground">{item.rateCode}</span>}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{formatAmount(item.rate)} / {item.unit}</p>
                  </div>
                  <div className="space-y-1">
                    <Controller control={control} name={`links.${item.id}`} render={({ field }) => (
                      <Select value={field.value} onValueChange={(value) => { if (value) field.onChange(value); }}>
                        <SelectTrigger aria-label={`Client line for item ${item.itemNo}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NOT_LINKED}>Not linked</SelectItem>
                          {options.clientContracts.map((client) => (
                            <SelectGroup key={client.id}>
                              <SelectLabel>{client.code} · {client.partyName ?? client.title}</SelectLabel>
                              {client.items.map((clientItem) => (
                                <SelectItem key={clientItem.id} value={clientItem.id}>
                                  {clientItem.itemNo} · {clientItem.description.slice(0, 60)}{suggestion === clientItem.id ? ' (suggested)' : ''}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    )} />
                    {linked && (
                      <p className="text-xs text-muted-foreground">
                        Client rate {formatAmount(linked.rate)} / {linked.unit}
                        {linked.unit.toLowerCase() === item.unit.toLowerCase()
                          ? ` · margin ${formatAmount(linked.rate - item.rate)} per ${item.unit}`
                          : ' · different units, compared by amount only'}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push(`/dashboard/billing/contracts/${contract.id}`)}>Cancel</Button>
        <Button type="submit" disabled={!isDirty || isSubmitting} loading={isSubmitting}>Save Links</Button>
      </div>
    </form>
  );
}
