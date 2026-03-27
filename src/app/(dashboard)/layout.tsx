'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Package, TrendingUp, BarChart3,
  Users, Store, UserCircle, ClipboardList, Settings, LogOut,
  Menu, X, ChevronDown, Truck, Tag, Percent, CalendarCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useModules } from '@/store/modules';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  moduleKey?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/overview', icon: LayoutDashboard },
  { label: 'POS / Cashier', href: '/cashier', icon: ShoppingCart },
  { label: 'Inventory', href: '/inventory', icon: Package },
  { label: 'Sales', href: '/sales', icon: TrendingUp },
  { label: 'Reports', href: '/reports', icon: BarChart3, moduleKey: 'reports' },
  { label: 'EOD Report', href: '/reports/eod', icon: CalendarCheck },
  { label: 'Staff', href: '/staff', icon: Users },
  { label: 'Stores', href: '/stores', icon: Store, moduleKey: 'multiStore' },
  { label: 'Customers', href: '/customers', icon: UserCircle, moduleKey: 'customerProfiles' },
  { label: 'Purchase Orders', href: '/purchase-orders', icon: ClipboardList, moduleKey: 'suppliers' },
  { label: 'Suppliers', href: '/suppliers', icon: Truck, moduleKey: 'suppliers' },
  { label: 'Tax Rates', href: '/tax-rates', icon: Percent, moduleKey: 'gstBilling' },
  { label: 'Discount Rules', href: '/discount-rules', icon: Tag, moduleKey: 'discountRules' },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, company, loading, loadUser, logout } = useAuthStore();
  const modules = useModules();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => { loadUser(); }, [loadUser]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FA]">
        <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  const filteredNav = navItems.filter((item) => {
    if (!item.moduleKey) return true;
    if (!modules) return true;
    return (modules as unknown as Record<string, unknown>)[item.moduleKey];
  });

  const roleLabel = user.role === 'OWNER' ? 'Owner' : user.role === 'MANAGER' ? 'Manager' : 'Cashier';

  return (
    <div className="flex h-screen bg-[#F8F9FA]">
      {/* Sidebar */}
      <aside
        className={cn(
          'bg-[#1B2559] flex flex-col transition-all duration-300 flex-shrink-0 print:hidden',
          sidebarOpen ? 'w-60' : 'w-0 overflow-hidden',
        )}
      >
        {/* Sidebar header */}
        <div className="px-5 py-5 border-b border-white/10">
          <h1 className="text-white font-bold text-lg">{company?.name || 'POS System'}</h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {filteredNav.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== '/overview' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white w-full transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0 print:hidden">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex-1" />

          {/* Profile dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="font-medium text-sm leading-tight">{user.name}</p>
                <p className="text-xs text-gray-400">{roleLabel}</p>
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
