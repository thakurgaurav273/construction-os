import { Settings } from 'lucide-react';
import type { HelpModule } from '../types';

export const settingsHelp: HelpModule = {
  key: 'settings',
  title: 'Settings',
  icon: Settings,
  routes: ['/dashboard/settings', '/dashboard/imports'],
  guides: [
    {
      id: 'settings.invite',
      title: 'Invite your team',
      summary: 'Send invitations and choose each person’s role.',
      permission: 'members.manage',
      keywords: ['members', 'roles', 'permissions'],
      steps: [
        'Open Settings → Members & Roles and click Invite Member.',
        'Enter their email and pick a role. Each role shows what it allows.',
        'They get a link to set their password and join. You can change roles later.',
      ],
    },
    {
      id: 'settings.security',
      title: 'Keep your account secure',
      summary: 'Change your password and sign out other devices.',
      keywords: ['password', 'sessions', 'devices'],
      steps: [
        'Open Settings → Security.',
        'Change your password with your current one; other devices are signed out.',
        'Under Active sessions, sign out any device you don’t recognise.',
      ],
    },
    {
      id: 'settings.notifications',
      title: 'Choose your notifications',
      summary: 'In-app and email, per kind of notification.',
      steps: [
        'Open Settings → Notifications.',
        'Turn in-app or email on or off for approvals, your requests, team updates and general news.',
      ],
    },
    {
      id: 'settings.data-import',
      title: 'Import data from a spreadsheet',
      summary: 'Bring in vendors, materials, workers and more.',
      permission: 'data.import',
      keywords: ['excel', 'csv', 'upload'],
      steps: [
        'Open Data Import and upload your sheet.',
        'Match your columns to SitePilot’s fields. AI proposes a match the first time; the layout is saved.',
        'Preview the rows, fix anything flagged, then import.',
      ],
    },
  ],
};
