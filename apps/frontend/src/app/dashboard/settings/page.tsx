'use client';

import React, { useEffect, useState } from 'react';
import {
  Bell, Building2, FileSpreadsheet, History, Palette, Plug, Shield, Sparkles, UserRound, Users, type LucideIcon,
} from 'lucide-react';
import { cn } from '@sitepilot/ui';
import { AuditLogsTab } from '@/features/audit/components/AuditLogsTab';
import { NotificationPreferencesTab } from '@/features/notifications/components/NotificationPreferencesTab';
import { AiSettingsTab } from '@/features/ai/components/AiSettingsTab';
import { BrandingTab } from '@/features/branding/components/BrandingTab';
import { OrganizationSettingsTab } from '@/features/settings/components/OrganizationSettingsTab';
import { MembersTab } from '@/features/settings/components/MembersTab';
import { ProfileTab } from '@/features/settings/components/ProfileTab';
import { SecurityTab } from '@/features/settings/components/SecurityTab';
import { IntegrationsTab } from '@/features/settings/components/IntegrationsTab';
import { ImportTemplatesTab } from '@/features/data-import/components/ImportTemplatesTab';

interface SettingsTab {
  id: string;
  name: string;
  icon: LucideIcon;
  component: React.ComponentType;
}

/** Personal settings first, then the workspace. Ids double as URL hashes, e.g. /dashboard/settings#notifications. */
const SECTIONS: { title: string; tabs: SettingsTab[] }[] = [
  {
    title: 'Account',
    tabs: [
      { id: 'profile', name: 'Profile', icon: UserRound, component: ProfileTab },
      { id: 'security', name: 'Security', icon: Shield, component: SecurityTab },
      { id: 'notifications', name: 'Notifications', icon: Bell, component: NotificationPreferencesTab },
    ],
  },
  {
    title: 'Workspace',
    tabs: [
      { id: 'organization', name: 'Organization', icon: Building2, component: OrganizationSettingsTab },
      { id: 'members', name: 'Members & Roles', icon: Users, component: MembersTab },
      { id: 'branding', name: 'Branding', icon: Palette, component: BrandingTab },
      { id: 'integrations', name: 'Integrations', icon: Plug, component: IntegrationsTab },
      { id: 'ai', name: 'AI', icon: Sparkles, component: AiSettingsTab },
      { id: 'data-import', name: 'Data Import', icon: FileSpreadsheet, component: ImportTemplatesTab },
      { id: 'audit', name: 'Audit Logs', icon: History, component: AuditLogsTab },
    ],
  },
];

const TABS = SECTIONS.flatMap((section) => section.tabs);
const DEFAULT_TAB = 'organization';

export default function SettingsPage(): React.ReactElement {
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);

  // Other screens link straight to a tab, and the hash keeps the tab across reloads.
  useEffect(() => {
    const openTabFromHash = (): void => {
      const tab = window.location.hash.slice(1);
      if (TABS.some((candidate) => candidate.id === tab)) setActiveTab(tab);
    };
    openTabFromHash();
    window.addEventListener('hashchange', openTabFromHash);
    return () => window.removeEventListener('hashchange', openTabFromHash);
  }, []);

  function openTab(id: string): void {
    setActiveTab(id);
    window.history.replaceState(null, '', `#${id}`);
  }

  const ActiveTab = (TABS.find((tab) => tab.id === activeTab) ?? TABS[0]).component;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your account, your team and how this workspace is set up.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col gap-6" aria-label="Settings">
            {SECTIONS.map((section) => (
              <div key={section.title} className="space-y-1">
                <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{section.title}</p>
                {section.tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => openTab(tab.id)}
                    aria-current={activeTab === tab.id ? 'page' : undefined}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.name}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 space-y-6">
          <ActiveTab />
        </main>
      </div>
    </div>
  );
}
