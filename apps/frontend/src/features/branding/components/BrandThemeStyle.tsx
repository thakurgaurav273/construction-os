'use client';

import React, { useEffect } from 'react';
import { useOrganizationSettings } from '@/hooks/api/use-settings';
import { HEX_COLOR, brandTokens } from '@/lib/brand-color';
import { BRAND_BOOT_STYLE_ID, DEVICE_CACHE_KEYS, removeDeviceCache, writeDeviceCache } from '@/lib/device-cache';

function brandCss(color: string): string {
  const { light, dark } = brandTokens(color);
  return `
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
}

/**
 * Applies the organization's brand colour to the theme tokens (buttons, links, focus rings, active
 * navigation) for every member. Without a brand colour the default SitePilot theme stays untouched.
 */
export function BrandThemeStyle(): React.ReactElement | null {
  const { data: organization, isSuccess } = useOrganizationSettings();
  const color = organization?.brandColor;
  const css = color && HEX_COLOR.test(color) ? brandCss(color) : null;

  // Once the server has answered, remember the colour for the next visit and retire the boot copy.
  useEffect(() => {
    if (!isSuccess) return;
    if (css) writeDeviceCache(DEVICE_CACHE_KEYS.brandCss, css);
    else removeDeviceCache(DEVICE_CACHE_KEYS.brandCss);
    document.getElementById(BRAND_BOOT_STYLE_ID)?.remove();
  }, [css, isSuccess]);

  // The values are computed from a validated hex colour, never raw user text.
  return css ? <style data-brand-theme>{css}</style> : null;
}
