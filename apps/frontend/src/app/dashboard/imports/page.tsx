'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Skeleton } from '@sitepilot/ui';
import { ShieldAlert } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Can } from '@/components/shared/Can';
import { ImportWizard } from '@/features/data-import/components/ImportWizard';
import { isImportEntity } from '@/features/data-import/import-entities';
import { PageAction, PageHeader } from '@/components/shared/PageHeader';

function ImportWizardFromQuery(): React.ReactElement {
  const requested = useSearchParams().get('entity');
  return <ImportWizard initialEntity={isImportEntity(requested) ? requested : null} />;
}

export default function ImportsPage(): React.ReactElement {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 p-4 pt-6 md:p-8">
      <PageHeader
        title="Import data"
        description="Bring in materials, vendors, opening stock and purchase orders from your own spreadsheets. SitePilot learns each layout once and reuses it."
      />
      <Can
        permission="data.import"
        fallback={(
          <EmptyState
            icon={ShieldAlert}
            title="Importing needs admin access"
            description="Ask an owner or admin to import the sheet, or to give your role permission to import data."
          />
        )}
      >
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <ImportWizardFromQuery />
        </Suspense>
      </Can>
    </div>
  );
}
