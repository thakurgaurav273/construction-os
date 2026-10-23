'use client';

import React from 'react';
import { ActiveSessionsCard } from './ActiveSessionsCard';
import { ChangePasswordCard } from './ChangePasswordCard';

/** Settings → Security: the signed-in person's password and devices. */
export function SecurityTab(): React.ReactElement {
  return (
    <div className="space-y-6">
      <ChangePasswordCard />
      <ActiveSessionsCard />
    </div>
  );
}
