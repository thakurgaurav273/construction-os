'use client';

import React from 'react';
import Link from 'next/link';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@sitepilot/ui';
import { LogOut, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useSignOut } from '../hooks/use-sign-out';
import { useCurrentAccess } from '@/hooks/api/use-access';

interface UserMenuProps {
  /** The element that opens the menu, e.g. the sidebar profile row or a header avatar. */
  children: React.ReactNode;
  align?: 'start' | 'end';
  side?: 'top' | 'bottom' | 'right';
}

export function UserMenu({ children, align = 'start', side = 'top' }: UserMenuProps): React.ReactElement {
  const user = useAuthStore((state) => state.user);
  const { signOut, isSigningOut } = useSignOut();
  const { data: access } = useCurrentAccess();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium truncate">{user?.name ?? 'Signed in'}</p>
          {user?.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings#profile">
            <UserRound className="mr-2 h-4 w-4" /> Your profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        {access?.isPlatformAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/platform">
              <ShieldCheck className="mr-2 h-4 w-4" /> Platform console
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => { void signOut(); }} disabled={isSigningOut}>
          <LogOut className="mr-2 h-4 w-4" /> {isSigningOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
