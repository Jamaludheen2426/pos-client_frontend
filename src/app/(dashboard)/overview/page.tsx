'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign, ShoppingCart, Package, Users, TrendingUp, TrendingDown,
  ArrowUpRight, CreditCard, Banknote, Smartphone, Clock, AlertTriangle,
  Activity, Zap, ArrowRight, RefreshCw, ReceiptText, Flame, Eye,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const money = (v: number) =>
  `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortDay = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
};

const paymentMeta: Record<string, { icon: typeof CreditCard; color: string; bg: string; text: string }> = {
  CASH: { icon: Banknote, color: '#34D399', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  CARD: { icon: CreditCard, color: '#6366F1', bg: 'bg-indigo-50', text: 'text-indigo-600' },
  UPI:  { icon: Smartphone, color: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-600' },
};

const getPM = (method: string) => paymentMeta[method] || paymentMeta.CASH;

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

const Skeleton = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={cn('skeleton-shimmer rounded-lg', className)} style={style} />
);

/* ------------------------------------------------------------------ */
/*  Area Chart (SVG)                                                   */
/* ------------------------------------------------------------------ */

const AreaChart = ({ data, maxVal }: { data: { date: string; revenue: number; count: number }[]; maxVal: number }) => {
  const w = 560;
  const h = 200;
  const padX = 0;
  const padY = 10;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  const points = data.map((d, i) => ({
    x: padX + (i / Math.max(data.length - 1, 1)) * innerW,
    y: padY + innerH - (d.revenue / Math.max(maxVal, 1)) * innerH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? w} ${h} L ${points[0]?.x ?? 0} ${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF6B6B" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((pct) => (
        <line
          key={pct}
          x1={0} y1={padY + innerH * (1 - pct)} x2={w} y2={padY + innerH * (1 - pct)}
          stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4"
        />
      ))}
      {/* Area fill */}
      <path d={areaPath} fill="url(#areaGrad)" className="animate-fade-in-scale" />
      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="500"
        className="animate-draw-line"
      />
      {/* Dots */}
      {points.map((p, i) => {
        const isToday = p.date === new Date().toISOString().split('T')[0];
        return (
          <g key={p.date}>
            {isToday && <circle cx={p.x} cy={p.y} r="10" fill="#FF6B6B" opacity="0.15" className="animate-fade-in-scale" />}
            <circle
              cx={p.x} cy={p.y} r={isToday ? 5 : 3.5}
              fill={isToday ? '#FF6B6B' : '#fff'}
              stroke={isToday ? '#FF6B6B' : '#FF6B6B'}
              strokeWidth={isToday ? 2 : 1.5}
              className="animate-fade-in-scale"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          </g>
        );
      })}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/*  Donut Ring (SVG)                                                   */
/* ------------------------------------------------------------------ */

const DonutRing = ({ data }: { data: { method: string; total: number }[] }) => {
  const total = data.reduce((s, d) => s + d.total, 0) || 1;
  const size = 160;
  const strokeW = 18;
  const radius = (size - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />
        {data.map((d, i) => {
          const pct = d.total / total;
          const dashLen = pct * circumference;
          const dashOffset = offset;
          offset += dashLen;
          return (
            <circle
              key={d.method}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={getPM(d.method).color}
              strokeWidth={strokeW}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={-dashOffset}
              strokeLinecap="round"
              className="transition-all duration-700"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-display font-semibold">Total</span>
        <span className="text-xl font-display font-extrabold text-gray-900 mt-0.5">{money(total)}</span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

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

  const refresh = () => { setRefreshing(true); load(); };

  const maxChartRevenue = useMemo(
    () => (stats?.dailyChart ? Math.max(...stats.dailyChart.map((d) => d.revenue), 1) : 1),
    [stats],
  );

  const totalPayments = useMemo(
    () => stats?.paymentBreakdown?.reduce((s, p) => s + p.total, 0) || 1,
    [stats],
  );

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  /* ── Render ── */
  return (
    <div className="space-y-7 max-w-[1400px] mx-auto">

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  HEADER — Editorial style                                   */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="flex items-end justify-between animate-fade-in-up">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-display font-semibold mb-2">
            Dashboard Overview
          </p>
          <h1 className="text-3xl font-display font-extrabold text-gray-900 tracking-tight leading-none">
            {greeting}, <span className="bg-gradient-to-r from-[#FF6B6B] to-[#F59E0B] bg-clip-text text-transparent">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-sm text-gray-400 mt-2 font-body">{dateStr}</p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200/80 text-sm font-display font-semibold text-gray-600 hover:border-[#FF6B6B]/30 hover:text-[#FF6B6B] hover:shadow-lg hover:shadow-[#FF6B6B]/5 transition-all duration-300 disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  HERO METRICS — Bento asymmetric grid                       */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-12 gap-4">

        {/* ── Revenue Hero Card (spanning 5 cols) ── */}
        <div
          className="col-span-12 lg:col-span-5 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-6 text-white animate-fade-in-up grain-overlay group hover:shadow-2xl hover:shadow-[#FF6B6B]/10 transition-all duration-500"
          style={{ animationDelay: '50ms' }}
        >
          {/* Decorative mesh */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#FF6B6B]/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#F59E0B]/10 to-transparent rounded-full blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <DollarSign size={18} className="text-[#FF6B6B]" />
                </div>
                <span className="text-xs uppercase tracking-wider text-white/50 font-display font-semibold">Today&apos;s Revenue</span>
              </div>
              {stats?.revenueChange !== undefined && stats.revenueChange !== 0 && (
                <div className={cn(
                  'flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur',
                  stats.revenueChange > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300',
                )}>
                  {stats.revenueChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(stats.revenueChange)}% vs yesterday
                </div>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="skeleton-shimmer h-12 w-48 rounded-lg opacity-20" />
                <div className="skeleton-shimmer h-4 w-32 rounded opacity-20" />
              </div>
            ) : (
              <>
                <p className="text-5xl font-display font-black tracking-tight animate-count-up leading-none">
                  {money(stats?.todayRevenue ?? 0)}
                </p>
                <div className="flex items-center gap-4 mt-4 text-white/40 text-xs font-display font-medium">
                  <span className="flex items-center gap-1.5">
                    <Flame size={12} className="text-[#FF6B6B]" />
                    {stats?.todaySales ?? 0} transactions
                  </span>
                  <span className="w-px h-3 bg-white/20" />
                  <span>Avg {money(stats?.avgOrderValue ?? 0)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Right KPI Stack (spanning 7 cols, 2x2 grid) ── */}
        <div className="col-span-12 lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Today's Sales",
              value: String(stats?.todaySales ?? 0),
              change: stats?.salesChange ?? 0,
              icon: ShoppingCart,
              accent: '#34D399',
              accentBg: 'bg-emerald-50',
              accentText: 'text-emerald-600',
            },
            {
              label: 'Avg Order Value',
              value: money(stats?.avgOrderValue ?? 0),
              change: null,
              icon: Activity,
              accent: '#F59E0B',
              accentBg: 'bg-amber-50',
              accentText: 'text-amber-600',
            },
            {
              label: 'Total Customers',
              value: String(stats?.totalCustomers ?? 0),
              change: null,
              icon: Users,
              accent: '#6366F1',
              accentBg: 'bg-indigo-50',
              accentText: 'text-indigo-600',
            },
            {
              label: 'Total Products',
              value: String(stats?.totalProducts ?? 0),
              change: null,
              icon: Package,
              accent: '#FF6B6B',
              accentBg: 'bg-red-50',
              accentText: 'text-red-500',
            },
            {
              label: "Today's Tax",
              value: money(stats?.todayTax ?? 0),
              change: null,
              icon: ReceiptText,
              accent: '#8B5CF6',
              accentBg: 'bg-violet-50',
              accentText: 'text-violet-600',
            },
            {
              label: "Discounts Given",
              value: money(stats?.todayDiscount ?? 0),
              change: null,
              icon: Zap,
              accent: '#EC4899',
              accentBg: 'bg-pink-50',
              accentText: 'text-pink-600',
            },
          ].map((card, idx) => (
            <div
              key={card.label}
              className="relative bg-white rounded-2xl border border-gray-100/80 p-4 hover:border-gray-200 hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 group animate-fade-in-up overflow-hidden"
              style={{ animationDelay: `${100 + idx * 60}ms` }}
            >
              {/* Subtle corner accent */}
              <div
                className="absolute top-0 right-0 w-16 h-16 rounded-bl-[40px] opacity-[0.06] transition-opacity group-hover:opacity-[0.12]"
                style={{ background: card.accent }}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', card.accentBg)}>
                    <card.icon size={17} className={card.accentText} />
                  </div>
                  {card.change !== null && card.change !== 0 && (
                    <span className={cn(
                      'text-[11px] font-bold px-2 py-0.5 rounded-full',
                      card.change > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500',
                    )}>
                      {card.change > 0 ? '+' : ''}{card.change}%
                    </span>
                  )}
                </div>

                {loading ? (
                  <>
                    <Skeleton className="h-7 w-20 mb-1.5" />
                    <Skeleton className="h-3.5 w-16" />
                  </>
                ) : (
                  <>
                    <p className="text-xl font-display font-extrabold text-gray-900 tracking-tight leading-none">{card.value}</p>
                    <p className="text-[11px] text-gray-400 mt-1.5 font-display font-medium tracking-wide uppercase">{card.label}</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  REVENUE CHART + PAYMENT BREAKDOWN                          */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Area Chart ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100/80 overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-display font-bold text-gray-900 tracking-tight">Revenue Trend</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last 7 days performance</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-gray-400 font-display font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-6 h-[2px] rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#F59E0B]" />
                Revenue
              </span>
            </div>
          </div>

          <div className="px-6 pb-2">
            {loading ? (
              <div className="h-[200px] flex items-end gap-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex-1">
                    <Skeleton className="w-full" style={{ height: `${40 + Math.random() * 60}%` }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px]">
                <AreaChart data={stats?.dailyChart ?? []} maxVal={maxChartRevenue} />
              </div>
            )}
          </div>

          {/* Day labels */}
          {!loading && stats?.dailyChart && (
            <div className="px-6 pb-5 flex justify-between">
              {stats.dailyChart.map((day) => {
                const isToday = day.date === new Date().toISOString().split('T')[0];
                return (
                  <div key={day.date} className="text-center flex-1">
                    <p className={cn(
                      'text-[11px] font-display font-semibold',
                      isToday ? 'text-[#FF6B6B]' : 'text-gray-400',
                    )}>
                      {shortDay(day.date)}
                    </p>
                    <p className="text-[10px] text-gray-300 mt-0.5">{money(day.revenue)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Payment Split ── */}
        <div className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '260ms' }}>
          <div className="px-6 py-5">
            <h3 className="text-sm font-display font-bold text-gray-900 tracking-tight">Payment Split</h3>
            <p className="text-xs text-gray-400 mt-0.5">Today&apos;s breakdown</p>
          </div>
          <div className="px-6 pb-6">
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <Skeleton className="w-40 h-40 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : !stats?.paymentBreakdown?.length ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <CreditCard size={24} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-400 font-display">No sales today</p>
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-6">
                  <DonutRing data={stats.paymentBreakdown} />
                </div>
                <div className="space-y-3">
                  {stats.paymentBreakdown.map((p, idx) => {
                    const pm = getPM(p.method);
                    const pct = totalPayments > 0 ? (p.total / totalPayments) * 100 : 0;
                    return (
                      <div
                        key={p.method}
                        className="flex items-center gap-3 animate-slide-in"
                        style={{ animationDelay: `${400 + idx * 100}ms` }}
                      >
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', pm.bg)}>
                          <pm.icon size={14} className={pm.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-display font-semibold text-gray-700">{p.method}</span>
                            <span className="text-xs font-display font-bold text-gray-900">{money(p.total)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${pct}%`, background: pm.color }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] font-display font-bold text-gray-400 w-9 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  RECENT SALES + LOW STOCK ALERTS                            */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Recent Transactions ── */}
        <div className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-display font-bold text-gray-900 tracking-tight">Recent Transactions</h3>
              <p className="text-xs text-gray-400 mt-0.5">Latest sales activity</p>
            </div>
            <Link href="/sales" className="flex items-center gap-1.5 text-xs font-display font-bold text-[#FF6B6B] hover:text-[#e55a5a] transition group/link">
              View All <ArrowRight size={12} className="group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-3.5 flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))
            ) : !stats?.recentSales?.length ? (
              <div className="px-6 py-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <ShoppingCart size={24} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-400 font-display">No transactions yet</p>
              </div>
            ) : (
              stats.recentSales.slice(0, 6).map((sale, idx) => {
                const pm = getPM(sale.paymentMethod);
                return (
                  <div
                    key={sale.id}
                    className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50/50 transition-colors cursor-pointer group animate-slide-in"
                    style={{ animationDelay: `${350 + idx * 60}ms` }}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105',
                      pm.bg,
                    )}>
                      <pm.icon size={17} className={pm.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display font-semibold text-gray-900 truncate">{sale.receiptNo}</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-body">
                        {sale.customer?.name || 'Walk-in'}
                        {sale.cashier ? ` \u2022 ${sale.cashier.name}` : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-display font-bold text-gray-900">{money(sale.totalAmount)}</p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                        <Clock size={9} />
                        {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Stock Alerts ── */}
        <div className="bg-white rounded-2xl border border-gray-100/80 overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '360ms' }}>
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-display font-bold text-gray-900 tracking-tight">Stock Alerts</h3>
              <p className="text-xs text-gray-400 mt-0.5">Items requiring attention</p>
            </div>
            <Link href="/inventory" className="flex items-center gap-1.5 text-xs font-display font-bold text-[#FF6B6B] hover:text-[#e55a5a] transition group/link">
              View All <ArrowRight size={12} className="group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-3.5 flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))
            ) : !stats?.lowStockProducts?.length ? (
              <div className="px-6 py-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <Package size={24} className="text-emerald-400" />
                </div>
                <p className="text-sm text-gray-400 font-display">All products well stocked</p>
              </div>
            ) : (
              stats.lowStockProducts.map((product, idx) => {
                const isOut = product.totalStock <= 0;
                const isCritical = product.totalStock > 0 && product.totalStock <= 3;
                return (
                  <div
                    key={product.id}
                    className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50/50 transition-colors group animate-slide-in"
                    style={{ animationDelay: `${400 + idx * 60}ms` }}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105',
                      isOut ? 'bg-red-50' : isCritical ? 'bg-orange-50' : 'bg-amber-50',
                    )}>
                      <AlertTriangle size={17} className={cn(
                        isOut ? 'text-red-500' : isCritical ? 'text-orange-500' : 'text-amber-500',
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display font-semibold text-gray-900 truncate">{product.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 font-body">
                        {product.sku}
                        {product.category ? ` \u2022 ${product.category}` : ''}
                      </p>
                    </div>
                    <span className={cn(
                      'px-3 py-1 rounded-full text-[11px] font-display font-bold flex-shrink-0',
                      isOut
                        ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
                        : isCritical
                          ? 'bg-orange-50 text-orange-600 ring-1 ring-orange-200'
                          : 'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
                    )}>
                      {isOut ? 'Out of stock' : `${product.totalStock} left`}
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
