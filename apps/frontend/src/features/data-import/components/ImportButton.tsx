import React from 'react';
import { Upload } from 'lucide-react';
import { Can } from '@/components/shared/Can';
import { PageAction } from '@/components/shared/PageHeader';
import type { ImportEntity } from '@/hooks/api/use-data-import';

/** Opens the spreadsheet import, preselecting what this page holds when there is a single answer. */
export function ImportButton({ entity }: { entity?: ImportEntity }): React.ReactElement {
  return (
    <Can permission="data.import">
      <PageAction icon={Upload} label="Import" href={entity ? `/dashboard/imports?entity=${entity}` : '/dashboard/imports'} />
    </Can>
  );
}
