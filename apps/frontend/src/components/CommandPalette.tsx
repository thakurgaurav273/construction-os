'use client';

import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { Dialog, DialogContent, DialogTitle } from '@sitepilot/ui';
import type { Permission } from '@sitepilot/types';
import { Search, CircleHelp, BookOpen, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCan } from '@/hooks/api/use-access';
import { navigation } from '@/components/layout/navigation';
import { useHelpStore } from '@/store/help.store';
import { useVisibleHelpModules } from '@/features/help/hooks/use-visible-help';

interface PaletteLink {
  name: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
}

/** The sidebar's items, so search hides exactly what the menu hides. */
const NAVIGATION: PaletteLink[] = navigation.flatMap((group) => group.items);


const ITEM_CLASS = 'flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground mt-1 text-foreground aria-selected:bg-accent aria-selected:text-accent-foreground';
const GROUP_CLASS = 'px-2 py-1 text-xs font-medium text-muted-foreground';

/** Every word must match; items whose own name matches rank above those matched only by keywords. */
function rankCommand(value: string, search: string, keywords: string[] = []): number {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  const name = value.toLowerCase();
  const extra = keywords.join(' ').toLowerCase();
  if (!words.every((word) => name.includes(word) || extra.includes(word))) return 0;
  return words.every((word) => name.includes(word)) ? 1 : 0.5;
}

export function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const router = useRouter();
  const can = useCan();
  const openHelp = useHelpStore((state) => state.openHelp);
  const helpModules = useVisibleHelpModules();
  const [search, setSearch] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setOpen]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    setSearch('');
    command();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden shadow-2xl rounded-xl border max-w-xl">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command filter={rankCommand} className="flex h-full w-full flex-col bg-popover text-popover-foreground">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Go to a page or search the guides..."
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>
            <Command.Group heading="Navigation" className={GROUP_CLASS}>
              {NAVIGATION.filter((link) => !link.permission || can(link.permission)).map((link) => (
                <Command.Item key={link.href} value={`Go to ${link.name}`} onSelect={() => runCommand(() => router.push(link.href))} className={ITEM_CLASS}>
                  <link.icon className="h-4 w-4" />
                  <span>Go to {link.name}</span>
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Separator className="my-1 h-px bg-border" />
            <Command.Group heading="Help" className={GROUP_CLASS}>
              <Command.Item value="Help & guides" keywords={['support', 'how to', 'tour']} onSelect={() => runCommand(() => openHelp())} className={ITEM_CLASS}>
                <CircleHelp className="h-4 w-4" />
                <span>Help &amp; guides</span>
              </Command.Item>
              {/* Guides only appear once something is typed, so the empty palette stays short. */}
              {search.trim() !== '' && helpModules.flatMap((helpModule) => helpModule.guides.map((guide) => (
                <Command.Item
                  key={guide.id}
                  value={`Guide: ${guide.title}`}
                  keywords={[helpModule.title, guide.summary, ...(guide.keywords ?? [])]}
                  onSelect={() => runCommand(() => openHelp(guide.id))}
                  className={ITEM_CLASS}
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="truncate">{guide.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{helpModule.title}</span>
                </Command.Item>
              )))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
