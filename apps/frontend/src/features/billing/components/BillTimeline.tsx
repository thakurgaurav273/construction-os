import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@sitepilot/ui';
import type { RaBillDetail } from '../types';

export function BillTimeline({ events }: { events: RaBillDetail['events'] }): React.ReactElement {
  return (
    <Card>
      <CardHeader><CardTitle>History</CardTitle></CardHeader>
      <CardContent>
        <ol className="space-y-4 border-l pl-4">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
              <p className="text-sm font-medium">{event.stage}</p>
              <p className="text-xs text-muted-foreground">{event.actorName} · {format(new Date(event.createdAt), 'dd MMM yyyy, HH:mm')}</p>
              {event.note && <p className="mt-1 text-sm text-muted-foreground">“{event.note}”</p>}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
