'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Package, TrendingUp, BarChart3,
  Users, Store, UserCircle, ClipboardList, Settings, LogOut,
  Truck, Tag, Percent, CalendarCheck, ChevronDown, Search,
  Bell, HelpCircle, Menu, X,
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

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { label: 'Home', href: '/overview', icon: LayoutDashboard },
      { label: 'Point of Sale', href: '/cashier', icon: ShoppingCart },
    ],
  },
  {
    title: 'Store',
    items: [
      { label: 'Sales', href: '/sales', icon: TrendingUp },
      { label: 'Customers', href: '/customers', icon: UserCircle, moduleKey: 'customerProfiles' },
      { label: 'Purchase Orders', href: '/purchase-orders', icon: ClipboardList, moduleKey: 'suppliers' },
    ],
  },
  {
    title: 'Products',
    items: [
      { label: 'Inventory', href: '/inventory', icon: Package },
      { label: 'Suppliers', href: '/suppliers', icon: Truck, moduleKey: 'suppliers' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Reports', href: '/reports', icon: BarChart3, moduleKey: 'reports' },
      { label: 'End of Day', href: '/reports/eod', icon: CalendarCheck },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { label: 'Staff', href: '/staff', icon: Users },
      { label: 'Stores', href: '/stores', icon: Store, moduleKey: 'multiStore' },
      { label: 'Tax Rates', href: '/tax-rates', icon: Percent, moduleKey: 'gstBilling' },
      { label: 'Discounts', href: '/discount-rules', icon: Tag, moduleKey: 'discountRules' },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

const SHOPIFY_GREEN = '#008060';

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
      <div className="flex h-screen items-center justify-center bg-[#F6F6F7]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#008060] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isActive = (href: string) =>
    href === '/overview'
      ? pathname === href
      : pathname === href || pathname.startsWith(href + '/');

  const isModuleVisible = (moduleKey?: string) => {
    if (!moduleKey) return true;
    if (!modules) return true;
    return !!(modules as unknown as Record<string, unknown>)[moduleKey];
  };

  const roleLabel =
    user.role === 'OWNER' ? 'Owner' :
    user.role === 'MANAGER' ? 'Manager' : 'Cashier';

  const initials = user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F6F6F7' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Poppins', sans-serif; }
        .nav-item { transition: background 0.12s, color 0.12s; }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #e1e3e5; border-radius: 4px; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside
        className={cn(
          'flex-shrink-0 flex flex-col bg-white border-r border-[#E1E3E5] transition-all duration-200 print:hidden overflow-hidden',
          sidebarOpen ? 'w-[240px]' : 'w-0',
        )}
      >
        {/* Store header */}
        <div className="px-4 py-4 border-b border-[#E1E3E5]">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: SHOPIFY_GREEN }}
            >
              {(company?.name || 'P').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#1A1A1A] truncate leading-tight">
                {company?.name || 'POS System'}
              </p>
              <p className="text-[11px] text-[#6D7175] font-medium leading-tight mt-0.5">{roleLabel}</p>
            </div>
            <ChevronDown size={14} className="text-[#6D7175] flex-shrink-0" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
          {navGroups.map((group, gi) => {
            const visibleItems = group.items.filter((item) => isModuleVisible(item.moduleKey));
            if (visibleItems.length === 0) return null;

            return (
              <div key={gi} className="mb-1">
                {group.title && (
                  <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#6D7175]">
                    {group.title}
                  </p>
                )}
                {visibleItems.map(({ label, href, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'nav-item mx-2 flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium',
                        active
                          ? 'text-[#008060] bg-[#EAF5F0]'
                          : 'text-[#1A1A1A] hover:bg-[#F6F6F7]',
                      )}
                    >
                      <Icon
                        size={16}
                        className="flex-shrink-0"
                        style={{ color: active ? SHOPIFY_GREEN : '#6D7175' }}
                      />
                      {label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Bottom: user + logout */}
        <div className="border-t border-[#E1E3E5] p-3 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
              style={{ background: '#1A1A1A' }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#1A1A1A] truncate leading-tight">{user.name}</p>
              <p className="text-[11px] text-[#6D7175] truncate leading-tight">{user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="nav-item w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium text-[#6D7175] hover:bg-[#FFF4F4] hover:text-red-600"
          >
            <LogOut size={15} className="flex-shrink-0" />
            Log out
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-[#E1E3E5] flex items-center px-4 gap-3 flex-shrink-0 print:hidden">
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6D7175] hover:bg-[#F6F6F7] transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Search bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6D7175]" />
              <input
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-[#F6F6F7] border border-[#E1E3E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] transition-all placeholder-[#9EA3A8]"
              />
            </div>
          </div>

          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6D7175] hover:bg-[#F6F6F7] transition-colors">
              <HelpCircle size={18} />
            </button>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6D7175] hover:bg-[#F6F6F7] transition-colors">
              <Bell size={18} />
            </button>

            {/* Profile */}
            <div className="relative ml-1">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-[#F6F6F7] transition-colors"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                  style={{ background: '#1A1A1A' }}
                >
                  {initials}
                </div>
                <span className="text-[13px] font-semibold text-[#1A1A1A] hidden sm:block">{user.name}</span>
                <ChevronDown size={13} className="text-[#6D7175]" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-[#E1E3E5] py-1.5 z-20">
                    <div className="px-4 py-2.5 border-b border-[#E1E3E5]">
                      <p className="text-[13px] font-bold text-[#1A1A1A]">{user.name}</p>
                      <p className="text-[11px] text-[#6D7175] mt-0.5">{user.email}</p>
                    </div>
                    <div className="py-1 px-1.5">
                      <Link
                        href="/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-[#1A1A1A] hover:bg-[#F6F6F7] transition-colors"
                      >
                        <Settings size={14} className="text-[#6D7175]" />
                        Settings
                      </Link>
                      <button
                        onClick={() => { setProfileOpen(false); logout(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={14} />
                        Log out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
