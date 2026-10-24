import { FileText } from 'lucide-react';
import type { HelpModule } from '../types';

export const dailyReportsHelp: HelpModule = {
  key: 'daily-reports',
  title: 'Daily Reports',
  icon: FileText,
  routes: ['/dashboard/daily-reports'],
  tour: 'daily-reports',
  guides: [
    {
      id: 'daily-reports.submit',
      title: 'Submit a daily report',
      summary: 'Record the day’s work, labour, materials and issues.',
      permission: 'dailyReport.write',
      keywords: ['dpr', 'site diary'],
      steps: [
        'Open Daily Reports and click New Report, then pick the project.',
        'Describe the work done, then add labour, materials used, equipment and any issues.',
        'Attach site photos if you have them.',
        'Save as a draft to finish later, or submit it for review. Submitted reports are locked.',
      ],
    },
    {
      id: 'daily-reports.review',
      title: 'Approve or send back a report',
      summary: 'Review reports submitted by your site team.',
      permission: 'dailyReport.approve',
      steps: [
        'Open a submitted report from the list or from the bell.',
        'Click Approve, or Send back with a note explaining what to fix.',
        'A report sent back becomes editable again; the author resubmits it.',
      ],
      tip: 'You can’t approve a report you wrote yourself.',
    },
  ],
};
