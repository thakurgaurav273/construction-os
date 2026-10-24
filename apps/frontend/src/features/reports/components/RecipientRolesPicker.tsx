'use client';

import React from 'react';
import { ORG_ROLES, formatRole } from '@/features/settings/constants';
import { ToggleChip } from './ToggleChip';

interface RecipientRolesPickerProps {
  id: string;
  value: string[];
  onChange: (roles: string[]) => void;
}

export function RecipientRolesPicker({ id, value, onChange }: RecipientRolesPickerProps): React.ReactElement {
  const toggle = (role: string): void => onChange(value.includes(role) ? value.filter((selected) => selected !== role) : [...value, role]);
  return (
    <div id={id} className="flex flex-wrap gap-2" role="group" aria-label="Recipient roles">
      {ORG_ROLES.map((role) => (
        <ToggleChip key={role} selected={value.includes(role)} onClick={() => toggle(role)}>{formatRole(role)}</ToggleChip>
      ))}
    </div>
  );
}
