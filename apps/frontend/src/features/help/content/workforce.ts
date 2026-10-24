import { Users } from 'lucide-react';
import type { HelpModule } from '../types';

export const workforceHelp: HelpModule = {
  key: 'workforce',
  title: 'Workforce & attendance',
  icon: Users,
  routes: ['/dashboard/workforce'],
  tour: 'workforce',
  guides: [
    {
      id: 'workforce.add-worker',
      title: 'Add workers and assign them',
      summary: 'Build your crew and put people on projects.',
      permission: 'workforce.manage',
      steps: [
        'Open Workforce and click Add Worker.',
        'Enter the name, trade, type (employee or contract) and contact details.',
        'Assign the worker to a project so they appear on that project’s attendance sheet.',
      ],
    },
    {
      id: 'workforce.mark-attendance',
      title: 'Mark attendance for a crew',
      summary: 'Present, absent, late or half-day, for a whole crew at once.',
      permission: 'attendance.mark',
      keywords: ['check in', 'check out', 'muster'],
      steps: [
        'Open Workforce and click Mark Attendance.',
        'Pick the project and date. Everyone assigned to the project is listed.',
        'Set each person’s status (or mark everyone present) and save.',
      ],
      tip: 'Attendance feeds the dashboard’s Workforce Today and the Workforce report.',
    },
    {
      id: 'workforce.certifications',
      title: 'Track certificates and renewals',
      summary: 'Safety induction, medical fitness and licences, with expiry alerts.',
      permission: 'workforce.manage',
      keywords: ['compliance', 'expiry', 'expired', 'licence', 'license', 'renew'],
      steps: [
        'Open a worker from the Directory and click Add under Certifications.',
        'Enter the certificate name, who issued it, and its issue and expiry dates. Leave expiry empty if it never expires.',
        'Status updates itself: expiring within 30 days, then expired the day after its expiry date.',
        'To renew, choose Edit or renew on the certificate and set the new dates.',
        'Workforce managers get a reminder (in the bell, and by email unless turned off) 30 days before expiry, in the final week, and once it has expired.',
      ],
      tip: 'The Compliance tab, the Workforce alerts and the Safety and Workforce reports list every certificate that needs renewal.',
    },
  ],
};
