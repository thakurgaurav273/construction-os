'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bell, Building2, Users, Shield, Palette, Plug, Sparkles, History, Trash2, CheckCircle2, Settings2, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@sitepilot/ui';
import { Button } from '@sitepilot/ui';
import { Input } from '@sitepilot/ui';
import { Badge } from '@sitepilot/ui';
import { Label } from '@sitepilot/ui';
import { Skeleton } from '@sitepilot/ui';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@sitepilot/ui';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { format } from 'date-fns';
import {
  useMembers,
  useInvitations,
  useInviteMember,
  useChangeMemberRole,
  useRemoveMember,
  useResendInvitation,
  useCancelInvitation,
  type Member,
  type Invitation,
} from '@/hooks/api/use-settings';
import { useCurrentAccess } from '@/hooks/api/use-access';
import { useAuthStore } from '@/store/auth.store';
import { Can } from '@/components/shared/Can';
import { AuditLogsTab } from '@/features/audit/components/AuditLogsTab';
import { NotificationPreferencesTab } from '@/features/notifications/components/NotificationPreferencesTab';
import { AiSettingsTab } from '@/features/ai/components/AiSettingsTab';
import { BrandingTab } from '@/features/branding/components/BrandingTab';
import { OrganizationSettingsTab } from '@/features/settings/components/OrganizationSettingsTab';

/** Must match OrgRole on the backend. */
const ROLES = ['OWNER', 'ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'STORE_MANAGER', 'PROCUREMENT', 'FINANCE', 'VIEWER'] as const;

const tabs = [
  { id: 'organization', name: 'Organization', icon: Building2 },
  { id: 'members', name: 'Members & Roles', icon: Users },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'security', name: 'Security & Auth', icon: Shield },
  { id: 'branding', name: 'Branding', icon: Palette },
  { id: 'integrations', name: 'Integrations', icon: Plug },
  { id: 'ai', name: 'AI', icon: Sparkles },
  { id: 'audit', name: 'Audit Logs', icon: History },
];

export default function SettingsPage() {
  const { data: access } = useCurrentAccess();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const canManageMembers = access?.permissions.includes('members.manage') ?? false;
  // Only owners can hand out or take away the Owner role (enforced server-side too).
  const assignableRoles = ROLES.filter((role) => role !== 'OWNER' || access?.role === 'OWNER');
  const [activeTab, setActiveTab] = useState('organization');

  // Other screens link straight to a tab, e.g. /dashboard/settings#notifications.
  useEffect(() => {
    const openTabFromHash = (): void => {
      const tab = window.location.hash.slice(1);
      if (tabs.some((candidate) => candidate.id === tab)) setActiveTab(tab);
    };
    openTabFromHash();
    window.addEventListener('hashchange', openTabFromHash);
    return () => window.removeEventListener('hashchange', openTabFromHash);
  }, []);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('VIEWER');

  const [deleteAlert, setDeleteAlert] = useState<{ open: boolean; memberId: string | null }>({ open: false, memberId: null });
  const [roleChangeAlert, setRoleChangeAlert] = useState<{ open: boolean; memberId: string | null; newRole: string | null }>({ open: false, memberId: null, newRole: null });

  // API hooks
  const { data: members = [], isLoading: loadingMembers } = useMembers();
  const { data: invitations = [], isLoading: loadingInvitations } = useInvitations({ enabled: canManageMembers });
  const inviteMutation = useInviteMember();
  const changeMemberRoleMutation = useChangeMemberRole();
  const removeMemberMutation = useRemoveMember();
  const resendInvitationMutation = useResendInvitation();
  const cancelInvitationMutation = useCancelInvitation();

  const handleInviteSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!inviteEmail) {
      toast.error('Enter an email address to invite.');
      return;
    }
    try {
      await inviteMutation.mutateAsync({ email: inviteEmail, role: inviteRole });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('VIEWER');
      setInviteOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to send invitation');
    }
  };

  const handleChangeRole = (memberId: string, newRole: string): void => {
    setRoleChangeAlert({ open: true, memberId, newRole });
  };

  const confirmRoleChange = async (): Promise<void> => {
    if (roleChangeAlert.memberId && roleChangeAlert.newRole) {
      try {
        await changeMemberRoleMutation.mutateAsync({ memberId: roleChangeAlert.memberId, role: roleChangeAlert.newRole });
        toast.success('Member role updated');
        setRoleChangeAlert({ open: false, memberId: null, newRole: null });
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to update role');
      }
    }
  };

  const confirmDeleteMember = async (): Promise<void> => {
    if (deleteAlert.memberId) {
      try {
        await removeMemberMutation.mutateAsync(deleteAlert.memberId);
        toast.success('Member removed');
        setDeleteAlert({ open: false, memberId: null });
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to remove member');
      }
    }
  };

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
          {activeTab === 'organization' && <OrganizationSettingsTab />}

          {activeTab === 'members' && (
            <div className="space-y-6">
              {/* Members Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Members</CardTitle>
                    <CardDescription>Manage who has access to this workspace.</CardDescription>
                  </div>
                  {canManageMembers && <Button onClick={() => setInviteOpen(true)}><Mail className="mr-2 h-4 w-4" /> Invite Member</Button>}
                </CardHeader>
                <CardContent>
                  {loadingMembers ? (
                    <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                  ) : members.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No members yet.</div>
                  ) : (
                    <div className="rounded-xl border overflow-x-auto w-full">
                      <table className="w-full text-sm text-left min-w-[600px]">
                        <thead className="bg-muted/50 text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">User</th>
                            <th className="px-4 py-3 font-medium">Role</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 font-medium">Joined</th>
                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {members.map((member: Member) => (
                            <tr key={member.id} className="hover:bg-muted/20">
                              <td className="px-4 py-3 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                                  {(member.name || member.email).charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium">{member.name || member.email}</p>
                                  <p className="text-xs text-muted-foreground">{member.email}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {canManageMembers && member.id !== currentUserId && (member.role !== 'OWNER' || access?.role === 'OWNER') ? (
                                  <Select value={member.role} onValueChange={(role) => handleChangeRole(member.id, role)}>
                                    <SelectTrigger className="w-40" aria-label={`Role for ${member.name || member.email}`}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {assignableRoles.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge variant="outline">{member.role.replace(/_/g, ' ')}</Badge>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="flex items-center text-emerald-600 text-xs font-medium">
                                  <CheckCircle2 className="mr-1 h-3 w-3" /> {member.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(member.joinedAt), 'MMM dd, yyyy')}</td>
                              <td className="px-4 py-3 text-right">
                                {canManageMembers && member.id !== currentUserId && (member.role !== 'OWNER' || access?.role === 'OWNER') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-600"
                                    aria-label={`Remove ${member.name || member.email}`}
                                    onClick={() => setDeleteAlert({ open: true, memberId: member.id })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pending Invitations Section */}
              {canManageMembers && (
              <Card>
                <CardHeader>
                  <CardTitle>Pending Invitations</CardTitle>
                  <CardDescription>Invitations awaiting response.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingInvitations ? (
                    <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                  ) : invitations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No pending invitations.</div>
                  ) : (
                    <div className="rounded-xl border overflow-x-auto w-full">
                      <table className="w-full text-sm text-left min-w-[500px]">
                        <thead className="bg-muted/50 text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">Email</th>
                            <th className="px-4 py-3 font-medium">Role</th>
                            <th className="px-4 py-3 font-medium">Expires</th>
                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {invitations.map((inv: Invitation) => (
                            <tr key={inv.id} className="hover:bg-muted/20">
                              <td className="px-4 py-3 font-medium">{inv.email}</td>
                              <td className="px-4 py-3"><Badge variant="outline">{inv.role.replace(/_/g, ' ')}</Badge></td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{format(new Date(inv.expiresAt), 'MMM dd, yyyy')}</td>
                              <td className="px-4 py-3 text-right space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => resendInvitationMutation.mutate(inv.id)}>Resend</Button>
                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => cancelInvitationMutation.mutate(inv.id)}>Cancel</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
              )}
            </div>
          )}

          {activeTab === 'audit' && <AuditLogsTab />}

          {activeTab === 'notifications' && <NotificationPreferencesTab />}

          {activeTab === 'ai' && <AiSettingsTab />}

          {activeTab === 'branding' && <BrandingTab />}

          {activeTab !== 'organization' && activeTab !== 'members' && activeTab !== 'audit' && activeTab !== 'notifications' && activeTab !== 'ai' && activeTab !== 'branding' && (
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

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>Send an invitation to join this workspace.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="name@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((r) => (
                    <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={inviteMutation.isPending}>{inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Member Dialog */}
      <Dialog open={deleteAlert.open} onOpenChange={(open) => setDeleteAlert({ open, memberId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAlert({ open: false, memberId: null })}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={confirmDeleteMember} disabled={removeMemberMutation.isPending}>
              {removeMemberMutation.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={roleChangeAlert.open} onOpenChange={(open) => setRoleChangeAlert({ open, memberId: null, newRole: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Member Role</DialogTitle>
            <DialogDescription>Update role to {roleChangeAlert.newRole?.replace(/_/g, ' ')}?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeAlert({ open: false, memberId: null, newRole: null })}>Cancel</Button>
            <Button onClick={confirmRoleChange} disabled={changeMemberRoleMutation.isPending}>
              {changeMemberRoleMutation.isPending ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}