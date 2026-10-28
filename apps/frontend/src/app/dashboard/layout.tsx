'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ModuleAccessGuard } from '@/components/layout/ModuleAccessGuard';
import { MobileBottomNav, MobileNavDrawer } from '@/components/layout/MobileNav';
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
        
        {/* Phones and small tablets: the menu slides in from the left. */}
        <div className="contents print:hidden">
          <MobileNavDrawer open={sidebarOpen} onOpenChange={setSidebarOpen} />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden print:block print:overflow-visible">
          <div className="contents print:hidden">
            <Header 
              onMenuClick={() => setSidebarOpen(true)} 
              onSearchClick={() => setCommandPaletteOpen(true)} 
            />
          </div>
          
          {/* Bottom padding keeps content clear of the phone tab bar. */}
          <main className="flex-1 overflow-y-auto bg-muted/20 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 print:overflow-visible print:bg-white print:pb-0">
            <ModuleAccessGuard>{children}</ModuleAccessGuard>
          </main>
        </div>
        
        <MobileBottomNav onMore={() => setSidebarOpen(true)} />
        <CommandPalette open={commandPaletteOpen} setOpen={setCommandPaletteOpen} />
        <HelpCenter />
        <ProductTour />
      </div>
    </>
  );
}
