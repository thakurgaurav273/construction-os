import { BarChart3 } from 'lucide-react';
import type { HelpModule } from '../types';

export const reportsHelp: HelpModule = {
  key: 'reports',
  title: 'Reports',
  icon: BarChart3,
  routes: ['/dashboard/reports'],
  tour: 'reports',
  guides: [
    {
      id: 'reports.generate',
      title: 'Generate a report',
      summary: 'PDF and Excel for a period and the projects you choose.',
      permission: 'report.manage',
      steps: [
        'Open Reports and pick a template such as Executive, Cost or Workforce.',
        'Choose the period and projects, then generate.',
        'When it’s ready, preview it in the app or download the PDF or Excel file.',
      ],
    },
    {
      id: 'reports.schedule',
      title: 'Schedule a report by email',
      summary: 'Send a report to your team every week or month.',
      permission: 'report.manage',
      steps: [
        'Open Reports → Schedules and create a schedule.',
        'Pick the report, how often it runs and who gets it (by role or by email).',
        'Use Run now to test it. You can pause or edit it any time.',
      ],
    },
  ],
};
