'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ModuleAccessGuard } from '@/components/layout/ModuleAccessGuard';
import { CommandPalette } from '@/components/CommandPalette';
import { BrandThemeStyle } from '@/features/branding/components/BrandThemeStyle';
import { HelpCenter } from '@/features/help/components/HelpCenter';
import { ProductTour } from '@/features/help/components/ProductTour';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  return (
    <>
      <BrandThemeStyle />
      {/* Printing shows only the page content, flowing over as many sheets as it needs. */}
      <div className="flex h-screen overflow-hidden bg-background print:block print:h-auto print:overflow-visible print:bg-white">
        <div className="contents print:hidden">
          <Sidebar />
        </div>
        
        {/* Mobile sidebar overlay would go here if we implemented the full mobile drawer */}

        <div className="flex flex-1 flex-col overflow-hidden print:block print:overflow-visible">
          <div className="contents print:hidden">
            <Header 
              onMenuClick={() => setSidebarOpen(true)} 
              onSearchClick={() => setCommandPaletteOpen(true)} 
            />
          </div>
          
          <main className="flex-1 overflow-y-auto bg-muted/20 print:overflow-visible print:bg-white">
            <ModuleAccessGuard>{children}</ModuleAccessGuard>
          </main>
        </div>
        
        <CommandPalette open={commandPaletteOpen} setOpen={setCommandPaletteOpen} />
        <HelpCenter />
        <ProductTour />
      </div>
    </>
  );
}
