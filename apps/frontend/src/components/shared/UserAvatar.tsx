import React from 'react';
import { Avatar, AvatarFallback, AvatarImage, cn } from '@sitepilot/ui';
import { API_URL } from '@/lib/api';
import { getInitials } from '@/lib/utils';

/** Photos uploaded to SitePilot are stored as API paths (/api/avatars/…); older avatars may be full URLs. */
export function avatarSrc(avatar: string | null | undefined): string | undefined {
  if (!avatar) return undefined;
  return avatar.startsWith('/') ? `${API_URL}${avatar}` : avatar;
}

interface UserAvatarProps {
  name: string;
  avatar: string | null | undefined;
  className?: string;
  fallbackClassName?: string;
}

/** A person's photo, or their initials while it loads or when they have none. */
export function UserAvatar({ name, avatar, className, fallbackClassName }: UserAvatarProps): React.ReactElement {
  return (
    <Avatar className={className}>
      <AvatarImage src={avatarSrc(avatar)} alt="" className="object-cover" />
      <AvatarFallback className={cn('bg-primary/10 font-bold text-primary', fallbackClassName)}>{getInitials(name) || '?'}</AvatarFallback>
    </Avatar>
  );
}
