import React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Button, cn } from '@sitepilot/ui';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** PageAction buttons (or other controls), primary action last. */
  actions?: React.ReactNode;
  className?: string;
}

/** Title, description and primary actions at the top of every module page, laid out the same everywhere. */
export function PageHeader({ title, description, actions, className }: PageHeaderProps): React.ReactElement {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px] sm:leading-9">{title}</h1>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type PageActionProps = {
  icon: LucideIcon;
  label: string;
  /** The page's main action: filled, and keeps its label on phones. Others are outlined and become icon buttons there. */
  primary?: boolean;
  href?: string;
} & Omit<React.ComponentPropsWithoutRef<typeof Button>, 'children' | 'variant' | 'asChild'>;

export const PageAction = React.forwardRef<HTMLButtonElement, PageActionProps>(function PageAction(
  { icon: Icon, label, primary = false, href, className, ...props },
  ref,
) {
  const content = (
    <>
      <Icon className={cn('h-4 w-4', primary ? 'mr-1.5' : 'sm:mr-1.5')} aria-hidden="true" />
      <span className={primary ? undefined : 'sr-only sm:not-sr-only'}>{label}</span>
    </>
  );
  const buttonClass = cn(!primary && 'w-9 px-0 sm:w-auto sm:px-4', className);
  if (href) {
    return (
      <Button ref={ref} variant={primary ? 'default' : 'outline'} className={buttonClass} title={label} asChild {...props}>
        <Link href={href}>{content}</Link>
      </Button>
    );
  }
  return (
    <Button ref={ref} variant={primary ? 'default' : 'outline'} className={buttonClass} title={label} {...props}>
      {content}
    </Button>
  );
});
