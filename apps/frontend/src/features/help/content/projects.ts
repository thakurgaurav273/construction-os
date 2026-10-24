import { Briefcase } from 'lucide-react';
import type { HelpModule } from '../types';

export const projectsHelp: HelpModule = {
  key: 'projects',
  title: 'Projects',
  icon: Briefcase,
  routes: ['/dashboard/projects'],
  tour: 'projects',
  guides: [
    {
      id: 'projects.create',
      title: 'Create your first project',
      summary: 'Start a project with its budget, dates and team.',
      permission: 'project.create',
      steps: [
        'Open Projects and click New Project.',
        'Enter the name, client, location, planned dates and budget.',
        'Open the project and add people under Team. Each person gets a project role.',
      ],
      tip: 'Daily reports, purchase orders, materials and bills are all filed against a project, so create it first.',
    },
    {
      id: 'projects.budget',
      title: 'Plan the budget by head',
      summary: 'Split the budget and watch committed and spent amounts.',
      permission: 'budget.manage',
      keywords: ['budget heads', 'committed', 'spent', 'unbudgeted'],
      steps: [
        'Open a project and go to the Budget tab.',
        'Add a head for each cost category (for example Cement, Steel, Labour) with its allocation.',
        'Committed comes from approved purchase orders and spent from approved vendor bills, both matched by category.',
        'Anything that matches no head shows as Unbudgeted, so you can add or rename a head.',
      ],
    },
    {
      id: 'projects.archive',
      title: 'Archive or restore a project',
      summary: 'Pause new work without losing history.',
      permission: 'project.update',
      steps: [
        'Open the project menu and choose Archive.',
        'Archived projects are read-only: new reports, orders, issues and bills are blocked, but money flows continue.',
        'Choose Restore from the same menu to reopen it with its previous status.',
      ],
    },
  ],
};
