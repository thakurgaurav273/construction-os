'use client';

import React from 'react';
import Link from 'next/link';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@sitepilot/ui';
import { LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useSignOut } from '../hooks/use-sign-out';

interface UserMenuProps {
  /** The element that opens the menu, e.g. the sidebar profile row or a header avatar. */
  children: React.ReactNode;
  align?: 'start' | 'end';
  side?: 'top' | 'bottom' | 'right';
}

export function UserMenu({ children, align = 'start', side = 'top' }: UserMenuProps): React.ReactElement {
  const user = useAuthStore((state) => state.user);
  const { signOut, isSigningOut } = useSignOut();

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
          <Link href="/dashboard/settings">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => { void signOut(); }} disabled={isSigningOut}>
          <LogOut className="mr-2 h-4 w-4" /> {isSigningOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
