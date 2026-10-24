export const NOTIFICATION_CATEGORIES = {
  approvals: {
    label: 'Waiting for you',
    description: 'Purchase orders, bills, payments, transfers and reports that need your approval.',
    defaults: { inApp: true, email: true },
  },
  decisions: {
    label: 'Your requests',
    description: 'When something you raised is approved, rejected, sent back or received.',
    defaults: { inApp: true, email: false },
  },
  team: {
    label: 'Team changes',
    description: 'When your role changes or you are added to a project.',
    defaults: { inApp: true, email: false },
  },
  reminders: {
    label: 'Reminders',
    description: 'Worker certificates that are about to expire or have expired.',
    defaults: { inApp: true, email: true },
  },
  general: {
    label: 'General updates',
    description: 'Other announcements about your organization.',
    defaults: { inApp: true, email: false },
  },
} as const satisfies Record<string, { label: string; description: string; defaults: { inApp: boolean; email: boolean } }>;

export type NotificationCategory = keyof typeof NOTIFICATION_CATEGORIES;

export const NOTIFICATION_CATEGORY_KEYS = Object.keys(NOTIFICATION_CATEGORIES) as NotificationCategory[];

export function isNotificationCategory(value: string): value is NotificationCategory {
  return Object.prototype.hasOwnProperty.call(NOTIFICATION_CATEGORIES, value);
}
