'use client';

import React, { useState } from 'react';
import { Building2, Users, Shield, Palette, Plug, Key, History, Save, Upload, Trash2, CheckCircle2, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@sitepilot/ui';
import { Button } from '@sitepilot/ui';
import { Input } from '@sitepilot/ui';
import { Badge } from '@sitepilot/ui';

const tabs = [
  { id: 'organization', name: 'Organization', icon: Building2 },
  { id: 'members', name: 'Members & Roles', icon: Users },
  { id: 'security', name: 'Security & Auth', icon: Shield },
  { id: 'branding', name: 'Branding', icon: Palette },
  { id: 'integrations', name: 'Integrations', icon: Plug },
  { id: 'api', name: 'API Keys', icon: Key },
  { id: 'audit', name: 'Audit Logs', icon: History },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('organization');

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your organization&apos;s workspace, billing, and team settings.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 space-y-6">
          {activeTab === 'organization' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Organization Details</CardTitle>
                  <CardDescription>Update your company&apos;s basic information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6 pb-6 border-b">
                    <div className="h-20 w-20 rounded-xl bg-muted border flex items-center justify-center shrink-0">
                      <Building2 className="h-8 w-8 text-muted-foreground opacity-50" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Workspace Logo</h4>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm"><Upload className="mr-2 h-4 w-4" /> Upload</Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/90"><Trash2 className="mr-2 h-4 w-4" /> Remove</Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Recommended size: 256x256px. Max 2MB.</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Company Name</label>
                      <Input defaultValue="Nexus Construction Group" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Workspace Slug</label>
                      <div className="flex items-center">
                        <span className="px-3 py-2 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">sitepilot.com/</span>
                        <Input defaultValue="nexus-group" className="rounded-l-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Support Email</label>
                      <Input defaultValue="support@nexus.com" type="email" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Headquarters</label>
                      <Input defaultValue="100 Construction Way, NY 10001" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button variant="outline">Discard Changes</Button>
                <Button><Save className="mr-2 h-4 w-4" /> Save Changes</Button>
              </div>
            </>
          )}

          {activeTab === 'members' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Members</CardTitle>
                  <CardDescription>Manage who has access to this workspace.</CardDescription>
                </div>
                <Button>Invite Member</Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border overflow-x-auto w-full">
                  <table className="w-full text-sm text-left min-w-[500px]">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">User</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {['Alex Manager', 'Sarah Engineer', 'John Safety'].map((user, i) => (
                        <tr key={i} className="hover:bg-muted/20">
                          <td className="px-4 py-3 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                              {user.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{user}</p>
                              <p className="text-xs text-muted-foreground">{user.toLowerCase().replace(' ', '.')}@nexus.com</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">{i === 0 ? 'Admin' : 'Editor'}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center text-emerald-600 text-xs font-medium">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab !== 'organization' && activeTab !== 'members' && (
            <Card className="border-dashed border-border/60 bg-gradient-to-b from-muted/10 to-muted/30 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
              <div className="flex flex-col items-center justify-center p-20 text-center text-muted-foreground">
                <div className="h-16 w-16 rounded-2xl bg-background border shadow-sm flex items-center justify-center mb-6">
                  <Settings2 className="h-8 w-8 text-primary/40" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight">Configuration Ready</h3>
                <p className="max-w-md text-sm mb-6 leading-relaxed">This settings module is visually complete for the demo environment. Active state persistence and backend integration will be unlocked in the next milestone.</p>
                <Button variant="outline" onClick={() => setActiveTab('organization')}>Return to Organization</Button>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
