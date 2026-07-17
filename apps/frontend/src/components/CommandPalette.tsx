'use client';

import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { Dialog, DialogContent } from '@sitepilot/ui';
import { Search, Briefcase, Users, FileText, ShoppingCart, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const router = useRouter();

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
    command();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden shadow-2xl rounded-xl border max-w-xl">
        <Command className="flex h-full w-full flex-col bg-popover text-popover-foreground">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input 
              placeholder="Type a command or search..." 
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>
            <Command.Group heading="Navigation" className="px-2 py-1 text-xs font-medium text-muted-foreground">
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/projects'))}
                className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground mt-1 text-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Briefcase className="h-4 w-4" />
                <span>Go to Projects</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/procurement'))}
                className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground mt-1 text-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Go to Procurement</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/workforce'))}
                className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground mt-1 text-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Users className="h-4 w-4" />
                <span>Go to Workforce</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/reports'))}
                className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground mt-1 text-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <FileText className="h-4 w-4" />
                <span>Go to Reports</span>
              </Command.Item>
            </Command.Group>
            <Command.Separator className="my-1 h-px bg-border" />
            <Command.Group heading="Quick Actions" className="px-2 py-1 text-xs font-medium text-muted-foreground">
              <Command.Item 
                onSelect={() => runCommand(() => console.log('Create Project'))}
                className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground mt-1 text-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Briefcase className="h-4 w-4" />
                <span>Create New Project...</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => router.push('/settings'))}
                className="flex items-center gap-2 rounded-sm px-2 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground mt-1 text-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
