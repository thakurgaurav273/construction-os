'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { CommandPalette } from '@/components/CommandPalette';
import { ThemeProvider } from 'next-themes';
import { BrandThemeStyle } from '@/features/branding/components/BrandThemeStyle';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrandThemeStyle />
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        
        {/* Mobile sidebar overlay would go here if we implemented the full mobile drawer */}

        <div className="flex flex-1 flex-col overflow-hidden">
          <Header 
            onMenuClick={() => setSidebarOpen(true)} 
            onSearchClick={() => setCommandPaletteOpen(true)} 
          />
          
          <main className="flex-1 overflow-y-auto bg-muted/20 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
            {children}
          </main>
        </div>
        
        <CommandPalette open={commandPaletteOpen} setOpen={setCommandPaletteOpen} />
      </div>
    </ThemeProvider>
  );
}
