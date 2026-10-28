'use client';

import React from 'react';
import { Input, cn } from '@sitepilot/ui';

type SecretInputProps = Omit<React.ComponentPropsWithoutRef<typeof Input>, 'type' | 'autoComplete'>;

function supportsTextMask(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('-webkit-text-security', 'disc');
}

/**
 * For API keys and access secrets. Browsers offer to save any password field and then sync it to every
 * device, so where the browser can mask a text field we use that instead; password managers are told to
 * ignore it either way. Browsers without masking fall back to a password field.
 */
export const SecretInput = React.forwardRef<HTMLInputElement, SecretInputProps>(function SecretInput({ className, ...props }, ref) {
  const [canMask, setCanMask] = React.useState(false);
  React.useEffect(() => setCanMask(supportsTextMask()), []);

  return (
    <Input
      ref={ref}
      {...props}
      type={canMask ? 'text' : 'password'}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      data-1p-ignore=""
      data-lpignore="true"
      data-bwignore=""
      data-form-type="other"
      className={cn(canMask && '[-webkit-text-security:disc]', className)}
    />
  );
});
