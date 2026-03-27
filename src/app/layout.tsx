import type { Metadata } from 'next';
import { Outfit, DM_Sans } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-display', weight: ['400', '500', '600', '700', '800', '900'] });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-body', weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: 'POS System',
  description: 'Point of Sale & Inventory Management',
  manifest: '/manifest.json',
  themeColor: '#1B2559',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${dmSans.variable} font-body`}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
