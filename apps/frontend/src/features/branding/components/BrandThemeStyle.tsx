'use client';

import React from 'react';
import { useOrganizationSettings } from '@/hooks/api/use-settings';
import { HEX_COLOR, brandTokens } from '@/lib/brand-color';

/**
 * Applies the organization's brand colour to the theme tokens (buttons, links, focus rings, active
 * navigation) for every member. Without a brand colour the default SitePilot theme stays untouched.
 */
export function BrandThemeStyle(): React.ReactElement | null {
  const { data: organization } = useOrganizationSettings();
  const color = organization?.brandColor;
  if (!color || !HEX_COLOR.test(color)) return null;

  const { light, dark } = brandTokens(color);
  const css = `
:root {
  --primary: ${light.primary};
  --primary-foreground: ${light.primaryForeground};
  --ring: ${light.primary};
  --sidebar-primary: ${light.primary};
  --sidebar-primary-foreground: ${light.primaryForeground};
  --sidebar-ring: ${light.primary};
}
.dark {
  --primary: ${dark.primary};
  --primary-foreground: ${dark.primaryForeground};
  --ring: ${dark.primary};
  --sidebar-primary: ${dark.primary};
  --sidebar-primary-foreground: ${dark.primaryForeground};
  --sidebar-ring: ${dark.primary};
}`;
  // The values are computed from a validated hex colour, never raw user text.
  return <style data-brand-theme>{css}</style>;
}
