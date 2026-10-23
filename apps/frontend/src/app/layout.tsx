import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/providers';
import { BRAND_BOOT_STYLE_ID, BRAND_CSS_STORAGE_KEY } from '@/lib/device-cache';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'SitePilot',
    template: '%s | SitePilot',
  },
  description: 'AI-native Construction ERP for contractors, developers and infrastructure companies.',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/**
 * Runs before first paint: re-applies the organization's brand colour from the last visit so buttons
 * don't flash the default colour while settings load. BrandThemeStyle replaces it once they arrive.
 */
const BRAND_BOOT_SCRIPT = `try{var c=localStorage.getItem(${JSON.stringify(BRAND_CSS_STORAGE_KEY)});if(c){var s=document.createElement('style');s.id=${JSON.stringify(BRAND_BOOT_STYLE_ID)};s.textContent=JSON.parse(c);document.head.appendChild(s);}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* eslint-disable-next-line react/no-danger -- static boot script, no user input */}
        <script dangerouslySetInnerHTML={{ __html: BRAND_BOOT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
