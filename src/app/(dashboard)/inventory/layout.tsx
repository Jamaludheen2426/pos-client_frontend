'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, ArrowLeftRight, Upload, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

const inventoryTabs = [
  { label: 'Products', href: '/inventory', icon: Package },
  { label: 'Stock Management', href: '/inventory/stock', icon: ArrowLeftRight },
  { label: 'Import Products', href: '/inventory/import', icon: Upload },
  { label: 'Print Labels', href: '/inventory/labels', icon: Printer },
];

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="bg-white rounded-xl border border-[#E1E3E5] mb-6 print:hidden">
        <div className="flex gap-0 border-b border-[#E1E3E5]">
          {inventoryTabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 -mb-px transition',
                  active
                    ? 'border-[#008060] text-[#008060]'
                    : 'border-transparent text-[#6D7175] hover:text-[#202223] hover:border-[#C9CCCF]',
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
