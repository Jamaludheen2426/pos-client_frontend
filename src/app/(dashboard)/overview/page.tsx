'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign, ShoppingBag, Users, Package,
  TrendingUp, TrendingDown, RefreshCw,
  Banknote, CreditCard, Smartphone,
  AlertTriangle, ArrowRight, ReceiptText,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

interface DashboardStats {
  todaySales: number;
  todayRevenue: number;
  todayTax: number;
  todayDiscount: number;
  avgOrderValue: number;
  revenueChange: number;
  salesChange: number;
  totalProducts: number;
  totalCustomers: number;
  dailyChart: { date: string; revenue: number; count: number }[];
  paymentBreakdown: { method: string; total: number }[];
  recentSales: {
    id: number;
    receiptNo: string;
    totalAmount: number;
    createdAt: string;
    customer?: { name: string };
    cashier?: { name: string };
    paymentMethod: string;
  }[];
  lowStockProducts: {
    id: number;
    name: string;
    sku: string;
    category?: string;
    totalStock: number;
  }[];
}

const fmt = (v: number) =>
  `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortDay = (dateStr: string) =>
  new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });

const paymentMeta: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  CASH:   { icon: Banknote,    color: '#008060', label: 'Cash'   },
  CARD:   { icon: CreditCard,  color: '#2C6ECB', label: 'Card'   },
  UPI:    { icon: Smartphone,  color: '#E67E22', label: 'UPI'    },
};

/* ── Skeleton pulse ── */
const Skel = ({ w = 'w-24', h = 'h-5' }: { w?: string; h?: string }) => (
  <div className={cn('animate-pulse bg-[#E1E3E5] rounded-md', w, h)} />
);

/* ── Tiny inline bar chart ── */
const BarChart = ({ data, max }: { data: { date: string; revenue: number }[]; max: number }) => (
  <div className="flex items-end gap-1 h-16">
    {data.map((d) => {
      const isToday = d.date === new Date().toISOString().split('T')[0];
      const pct = max > 0 ? (d.revenue / max) * 100 : 0;
      return (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className="w-full rounded-sm transition-all"
            style={{
              height: `${Math.max(pct, 4)}%`,
              background: isToday ? '#008060' : '#B5D5CB',
              minHeight: 4,
            }}
          />
          <span className={cn('text-[9px] font-semibold', isToday ? 'text-[#008060]' : 'text-[#6D7175]')}>
            {shortDay(d.date)}
          </span>
        </div>
      );
    })}
  </div>
);

/* ── Donut chart ── */
const Donut = ({ data }: { data: { method: string; total: number }[] }) => {
  const total = data.reduce((s, d) => s + d.total, 0) || 1;
  const size = 120;
  const sw = 14;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const colors = ['#008060', '#2C6ECB', '#E67E22', '#6D7175'];

  return (
    <div className="relative inline-flex">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F1F1" strokeWidth={sw} />
        {data.map((d, i) => {
          const pct = d.total / total;
          const dash = pct * circ;
          const seg = (
            <circle
              key={d.method}
              cx={size / 2} cy={size / 2} r={r}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth={sw}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-[#1A1A1A]">{fmt(total)}</span>
      </div>
    </div>
  );
};

export default function OverviewPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    api.get('/reports/dashboard')
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, []);

  const maxRev = useMemo(
    () => Math.max(...(stats?.dailyChart?.map((d) => d.revenue) ?? [1]), 1),
    [stats],
  );

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="p-6 max-w-[1280px] mx-auto space-y-6" style={{ fontFamily: "'Poppins', sans-serif" }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1A1A]">
            {greeting()}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-[#6D7175] mt-0.5">{today}</p>
        </div>
        <button
          onClick={() => { setRefreshing(true); load(); }}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E1E3E5] bg-white text-sm font-semibold text-[#1A1A1A] hover:bg-[#F6F6F7] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Today's revenue",
            value: loading ? null : fmt(stats?.todayRevenue ?? 0),
            change: stats?.revenueChange ?? 0,
            icon: DollarSign,
            iconBg: '#EAF5F0',
            iconColor: '#008060',
          },
          {
            label: 'Orders today',
            value: loading ? null : String(stats?.todaySales ?? 0),
            change: stats?.salesChange ?? 0,
            icon: ShoppingBag,
            iconBg: '#EEF3FB',
            iconColor: '#2C6ECB',
          },
          {
            label: 'Total customers',
            value: loading ? null : String(stats?.totalCustomers ?? 0),
            change: null,
            icon: Users,
            iconBg: '#FEF3E2',
            iconColor: '#B25000',
          },
          {
            label: 'Total products',
            value: loading ? null : String(stats?.totalProducts ?? 0),
            change: null,
            icon: Package,
            iconBg: '#F2F0FF',
            iconColor: '#5246E9',
          },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-[#E1E3E5] p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="text-xs font-semibold text-[#6D7175] uppercase tracking-wide">{card.label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: card.iconBg }}>
                <card.icon size={15} style={{ color: card.iconColor }} />
              </div>
            </div>
            {card.value === null ? (
              <Skel w="w-28" h="h-8" />
            ) : (
              <p className="text-[26px] font-bold text-[#1A1A1A] leading-none">{card.value}</p>
            )}
            {card.change !== null && (
              <div className="flex items-center gap-1 mt-2">
                {(card.change ?? 0) >= 0 ? (
                  <TrendingUp size={12} className="text-[#008060]" />
                ) : (
                  <TrendingDown size={12} className="text-red-500" />
                )}
                <span className={cn(
                  'text-xs font-semibold',
                  (card.change ?? 0) >= 0 ? 'text-[#008060]' : 'text-red-500',
                )}>
                  {Math.abs(card.change ?? 0)}% vs yesterday
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E1E3E5] p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold text-[#1A1A1A]">Revenue — last 7 days</p>
            {!loading && stats && (
              <span className="text-xs font-semibold text-[#6D7175]">
                Peak: {fmt(maxRev)}
              </span>
            )}
          </div>
          <p className="text-xs text-[#6D7175] mb-4">Today shown in green</p>

          {loading ? (
            <div className="flex items-end gap-1 h-16">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 animate-pulse bg-[#E1E3E5] rounded-sm"
                  style={{ height: `${30 + Math.random() * 50}%` }} />
              ))}
            </div>
          ) : (
            <BarChart data={stats?.dailyChart ?? []} max={maxRev} />
          )}

          <div className="mt-5 pt-4 border-t border-[#F1F1F1] grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-[#6D7175]">Tax collected</p>
              {loading ? <Skel w="w-16" h="h-4" /> : (
                <p className="text-sm font-bold text-[#1A1A1A] mt-0.5">{fmt(stats?.todayTax ?? 0)}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-[#6D7175]">Discounts given</p>
              {loading ? <Skel w="w-16" h="h-4" /> : (
                <p className="text-sm font-bold text-[#1A1A1A] mt-0.5">{fmt(stats?.todayDiscount ?? 0)}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-[#6D7175]">Avg order value</p>
              {loading ? <Skel w="w-16" h="h-4" /> : (
                <p className="text-sm font-bold text-[#1A1A1A] mt-0.5">{fmt(stats?.avgOrderValue ?? 0)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="bg-white rounded-xl border border-[#E1E3E5] p-5">
          <p className="text-sm font-bold text-[#1A1A1A] mb-1">Payment methods</p>
          <p className="text-xs text-[#6D7175] mb-4">Today's breakdown</p>

          {loading ? (
            <div className="space-y-3">
              <Skel w="w-full" h="h-4" />
              <Skel w="w-4/5" h="h-4" />
              <Skel w="w-3/5" h="h-4" />
            </div>
          ) : !stats?.paymentBreakdown?.length ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-[#6D7175]">No transactions yet today</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5">
              <Donut data={stats.paymentBreakdown} />
              <div className="w-full space-y-3">
                {stats.paymentBreakdown.map((p) => {
                  const meta = paymentMeta[p.method] || paymentMeta.CASH;
                  const total = stats.paymentBreakdown.reduce((s, d) => s + d.total, 0) || 1;
                  const pct = Math.round((p.total / total) * 100);
                  return (
                    <div key={p.method}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <meta.icon size={13} style={{ color: meta.color }} />
                          <span className="text-xs font-semibold text-[#1A1A1A]">{meta.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#6D7175]">{pct}%</span>
                          <span className="text-xs font-bold text-[#1A1A1A]">{fmt(p.total)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[#F1F1F1] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: meta.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom tables ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent sales */}
        <div className="bg-white rounded-xl border border-[#E1E3E5] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F1F1]">
            <p className="text-sm font-bold text-[#1A1A1A]">Recent orders</p>
            <Link href="/sales" className="flex items-center gap-1 text-xs font-semibold text-[#008060] hover:underline">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="divide-y divide-[#F1F1F1]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                  <Skel w="w-8" h="h-8" />
                  <div className="flex-1 space-y-1.5">
                    <Skel w="w-32" h="h-3" />
                    <Skel w="w-20" h="h-3" />
                  </div>
                  <Skel w="w-16" h="h-4" />
                </div>
              ))
            ) : !stats?.recentSales?.length ? (
              <div className="px-5 py-10 text-center text-sm text-[#6D7175]">No orders yet today</div>
            ) : (
              stats.recentSales.slice(0, 6).map((sale) => (
                <div key={sale.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-[#F6F6F7] transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-[#F6F6F7] flex items-center justify-center flex-shrink-0">
                    <ReceiptText size={14} className="text-[#6D7175]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{sale.receiptNo}</p>
                    <p className="text-xs text-[#6D7175]">
                      {sale.customer?.name || 'Walk-in'} · {sale.cashier?.name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] font-bold text-[#1A1A1A]">{fmt(sale.totalAmount)}</p>
                    <p className="text-[11px] text-[#6D7175]">
                      {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low stock */}
        <div className="bg-white rounded-xl border border-[#E1E3E5] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F1F1]">
            <p className="text-sm font-bold text-[#1A1A1A]">Low stock alerts</p>
            <Link href="/inventory" className="flex items-center gap-1 text-xs font-semibold text-[#008060] hover:underline">
              Manage <ArrowRight size={12} />
            </Link>
          </div>

          <div className="divide-y divide-[#F1F1F1]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                  <Skel w="w-8" h="h-8" />
                  <div className="flex-1 space-y-1.5">
                    <Skel w="w-36" h="h-3" />
                    <Skel w="w-16" h="h-3" />
                  </div>
                  <Skel w="w-12" h="h-5" />
                </div>
              ))
            ) : !stats?.lowStockProducts?.length ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-[#6D7175]">All stock levels look healthy</p>
              </div>
            ) : (
              stats.lowStockProducts.slice(0, 6).map((product) => {
                const isOut = product.totalStock <= 0;
                return (
                  <div key={product.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-[#F6F6F7] transition-colors">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      isOut ? 'bg-red-50' : 'bg-[#FEF3E2]',
                    )}>
                      <AlertTriangle size={14} className={isOut ? 'text-red-500' : 'text-[#B25000]'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{product.name}</p>
                      <p className="text-xs text-[#6D7175]">{product.sku}{product.category ? ` · ${product.category}` : ''}</p>
                    </div>
                    <span className={cn(
                      'text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0',
                      isOut
                        ? 'bg-red-50 text-red-600'
                        : 'bg-[#FEF3E2] text-[#B25000]',
                    )}>
                      {isOut ? 'Out' : `${product.totalStock} left`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
