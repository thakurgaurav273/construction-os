import { Rocket } from 'lucide-react';
import type { HelpModule } from '../types';

export const gettingStartedHelp: HelpModule = {
  key: 'getting-started',
  title: 'Getting started',
  icon: Rocket,
  routes: ['/dashboard'],
  tour: 'welcome',
  guides: [
    {
      id: 'getting-started.find-your-way',
      title: 'Find your way around',
      summary: 'The sidebar, search, notifications and help.',
      steps: [
        'Use the sidebar to move between modules. You only see the modules your role can use.',
        'Press ⌘K (Ctrl K on Windows) to jump to any page or search these guides.',
        'The bell shows approvals waiting for you and updates on your own requests. Click one to open it.',
        'The ? button opens this help center on the guide for the page you are on.',
      ],
    },
    {
      id: 'getting-started.switch-organization',
      title: 'Work in more than one organization',
      summary: 'Move between companies you belong to without signing out.',
      keywords: ['switch', 'company', 'workspace', 'tenant', 'organisation'],
      steps: [
        'Accept the invitation from the other organization with the same email; your account joins it.',
        'Click your organization’s name at the top of the sidebar (or open the account menu on a phone) and pick another organization.',
        'Everything you see, and what your role allows, follows the organization you’re in.',
        'Next time you sign in, SitePilot opens the organization you used last.',
      ],
    },
    {
      id: 'getting-started.set-up-organization',
      title: 'Set up your organization',
      summary: 'Company details, branding and your team.',
      permission: 'organization.manage',
      keywords: ['gstin', 'logo', 'currency', 'time zone'],
      steps: [
        'Open Settings → Organization and fill in your address, GSTIN, currency and time zone.',
        'In Settings → Branding, upload your logo and pick a brand colour. Everyone in the organization sees it.',
        'In Settings → Members & Roles, invite your team and give each person the role that matches their job.',
      ],
      tip: 'Roles decide what each person sees. You can view exactly what a role allows under Roles & Permissions.',
    },
  ],
};
