'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, ArrowLeftRight, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const inventoryTabs = [
  { label: 'Products', href: '/inventory', icon: Package },
  { label: 'Stock Management', href: '/inventory/stock', icon: ArrowLeftRight },
  { label: 'Import Products', href: '/inventory/import', icon: Upload },
];

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      {/* Tab navigation */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="flex gap-0 border-b border-gray-200">
          {inventoryTabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 -mb-px transition',
                  active
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
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
