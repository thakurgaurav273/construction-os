import React from 'react';
import Link from 'next/link';
import { Button } from '@sitepilot/ui';
import { Upload } from 'lucide-react';
import { Can } from '@/components/shared/Can';
import type { ImportEntity } from '@/hooks/api/use-data-import';

/** Opens the spreadsheet import, preselecting what this page holds when there is a single answer. */
export function ImportButton({ entity }: { entity?: ImportEntity }): React.ReactElement {
  return (
    <Can permission="data.import">
      <Button variant="outline" asChild>
        <Link href={entity ? `/dashboard/imports?entity=${entity}` : '/dashboard/imports'}>
          <Upload className="mr-1.5 h-4 w-4" /> Import
        </Link>
      </Button>
    </Can>
  );
}
