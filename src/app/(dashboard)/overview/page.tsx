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
  CASH: { icon: Banknote, color: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-500' },
  CARD: { icon: CreditCard, color: '#3B82F6', bg: 'bg-blue-50', text: 'text-blue-500' },
  UPI:  { icon: Smartphone, color: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-500' },
};

const getPM = (method: string) => paymentMeta[method] || paymentMeta.CASH;

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

const Skeleton = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={cn('animate-pulse bg-white/20 rounded-xl', className)} style={style} />
);
const SkeletonDark = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={cn('animate-pulse bg-slate-200 rounded-xl', className)} style={style} />
);

/* ------------------------------------------------------------------ */
/*  Area Chart (SVG)                                                   */
/* ------------------------------------------------------------------ */

const AreaChart = ({ data, maxVal }: { data: { date: string; revenue: number; count: number }[]; maxVal: number }) => {
  const w = 600;
  const h = 220;
  const padX = 0;
  const padY = 20;
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
        <linearGradient id="areaGradPremium" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Grid lines */}
      {[0.33, 0.66, 1].map((pct) => (
        <line
          key={pct}
          x1={0} y1={padY + innerH * (1 - pct)} x2={w} y2={padY + innerH * (1 - pct)}
          stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4"
        />
      ))}
      
      <path d={areaPath} fill="url(#areaGradPremium)" />
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      
      {points.map((p, i) => {
        const isToday = p.date === new Date().toISOString().split('T')[0];
        return (
          <g key={p.date}>
            {isToday && <circle cx={p.x} cy={p.y} r="8" fill="#3b82f6" opacity="0.2" />}
            <circle cx={p.x} cy={p.y} r={isToday ? 4 : 2} fill="#fff" stroke="#3b82f6" strokeWidth={2} />
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
  const size = 180;
  const strokeW = 16;
  const radius = (size - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f8fafc" strokeWidth={strokeW} />
        {data.map((d, i) => {
          const pct = d.total / total;
          const dashLen = pct * circumference;
          const dashOffset = offset;
          offset += dashLen;
          return (
            <circle
              key={d.method} cx={size / 2} cy={size / 2} r={radius} fill="none"
              stroke={getPM(d.method).color} strokeWidth={strokeW} strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={-dashOffset} strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-display font-extrabold text-slate-800">{money(total)}</span>
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

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 px-4 py-8">

      {/* ═ HEADER ═ */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-800 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back, {user?.name}</p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition shadow disabled:opacity-50"
        >
          <RefreshCw size={16} className={cn(refreshing && 'animate-spin')} />
          {refreshing ? 'Updating...' : 'Update Data'}
        </button>
      </div>

      {/* ═ THE VIBRANT SOLID CARDS ROW ═ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Card 1: Revenue */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-lg shadow-indigo-500/20 p-6 text-white group cursor-pointer hover:-translate-y-1 transition-transform">
          <DollarSign className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
               <span className="text-indigo-100 font-medium tracking-wide">Gross Revenue</span>
               <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                 <DollarSign size={20} />
               </div>
            </div>
            {loading ? <Skeleton className="h-10 w-32" /> : (
              <h2 className="text-4xl font-bold tracking-tight">{money(stats?.todayRevenue ?? 0)}</h2>
            )}
            <div className="mt-4 flex items-center gap-2 text-sm text-indigo-100 bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-md">
              <TrendingUp size={14} /> +{stats?.revenueChange || 0}% from yesterday
            </div>
          </div>
        </div>

        {/* Card 2: Orders */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg shadow-teal-500/20 p-6 text-white group cursor-pointer hover:-translate-y-1 transition-transform">
          <ShoppingCart className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
               <span className="text-teal-50 font-medium tracking-wide">Total Sales Count</span>
               <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                 <ShoppingCart size={20} />
               </div>
            </div>
            {loading ? <Skeleton className="h-10 w-24" /> : (
              <h2 className="text-4xl font-bold tracking-tight">{stats?.todaySales ?? 0}</h2>
            )}
            <div className="mt-4 flex items-center gap-2 text-sm text-teal-50 bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-md">
              <TrendingUp size={14} /> +{(stats?.salesChange || 0)}% from yesterday
            </div>
          </div>
        </div>

        {/* Card 3: Customers */}
        <div className="relative overflow-hidden bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-2xl shadow-lg shadow-fuchsia-500/20 p-6 text-white group cursor-pointer hover:-translate-y-1 transition-transform">
          <Users className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
               <span className="text-fuchsia-100 font-medium tracking-wide">Active Customers</span>
               <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                 <Users size={20} />
               </div>
            </div>
            {loading ? <Skeleton className="h-10 w-24" /> : (
              <h2 className="text-4xl font-bold tracking-tight">{stats?.totalCustomers ?? 0}</h2>
            )}
            <div className="mt-4 flex items-center gap-2 text-sm text-fuchsia-100 bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-md">
              <Activity size={14} /> Platform reach
            </div>
          </div>
        </div>

        {/* Card 4: Avg Order Value */}
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl shadow-lg shadow-orange-500/20 p-6 text-white group cursor-pointer hover:-translate-y-1 transition-transform">
          <Activity className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
               <span className="text-amber-50 font-medium tracking-wide">Avg Order Value</span>
               <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                 <Activity size={20} />
               </div>
            </div>
            {loading ? <Skeleton className="h-10 w-24" /> : (
              <h2 className="text-4xl font-bold tracking-tight">{money(stats?.avgOrderValue ?? 0)}</h2>
            )}
            <div className="mt-4 flex items-center gap-2 text-sm text-amber-50 bg-white/10 w-fit px-3 py-1 rounded-full backdrop-blur-md">
               <TrendingUp size={14} /> Trailing 24h
            </div>
          </div>
        </div>
      </div>

      {/* ═ MINI SECONDARY STATS ROW ═ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-500"><ReceiptText size={20} /></div>
           <div>
             <div className="text-xs font-bold text-slate-400 uppercase">Tax Collected</div>
             <div className="text-lg font-bold text-slate-800">{loading ? <SkeletonDark className="h-6 w-16" /> : money(stats?.todayTax ?? 0)}</div>
           </div>
         </div>
         <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-500"><Zap size={20} /></div>
           <div>
             <div className="text-xs font-bold text-slate-400 uppercase">Total Discounts</div>
             <div className="text-lg font-bold text-slate-800">{loading ? <SkeletonDark className="h-6 w-16" /> : money(stats?.todayDiscount ?? 0)}</div>
           </div>
         </div>
         <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
           <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-500"><Package size={20} /></div>
           <div>
             <div className="text-xs font-bold text-slate-400 uppercase">Products Total</div>
             <div className="text-lg font-bold text-slate-800">{loading ? <SkeletonDark className="h-6 w-16" /> : (stats?.totalProducts ?? 0)}</div>
           </div>
         </div>
      </div>

      {/* ═ CHARTS ROW ═ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Revenue Over Time (7 Days)</h2>
          {loading ? (
             <div className="h-[200px] flex items-end gap-3 pb-6">
                {Array.from({ length: 7 }).map((_, i) => (
                  <SkeletonDark key={i} className="flex-1 w-full rounded-md" style={{ height: `${20 + Math.random() * 80}%` }} />
                ))}
            </div>
          ) : (
            <div className="h-[220px] w-full">
              <AreaChart data={stats?.dailyChart ?? []} maxVal={maxChartRevenue} />
              <div className="flex justify-between items-center mt-3 border-t border-slate-50 pt-3">
                {stats?.dailyChart?.map((day) => {
                  const isToday = day.date === new Date().toISOString().split('T')[0];
                  return (
                    <div key={day.date} className="text-center w-full">
                      <p className={cn("text-[11px] font-bold", isToday ? "text-blue-600" : "text-slate-400")}>{shortDay(day.date)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Payment Split */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Payment Overview</h2>
          {loading ? (
            <div className="flex-1 flex flex-col justify-center gap-6"><SkeletonDark className="w-40 h-40 rounded-full mx-auto" /></div>
          ) : !stats?.paymentBreakdown?.length ? (
            <div className="flex-1 flex items-center justify-center"><span className="text-slate-400 text-sm">No transactions yet</span></div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div className="flex justify-center my-4">
                <DonutRing data={stats.paymentBreakdown} />
              </div>
              <div className="space-y-4 mt-6">
                {stats.paymentBreakdown.map((p) => {
                  const pm = getPM(p.method);
                  return (
                    <div key={p.method} className="flex items-center justify-between">
                       <span className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                         <pm.icon size={16} className={pm.text} /> {p.method}
                       </span>
                       <span className="text-sm font-bold text-slate-900">{money(p.total)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═ DATA TABLES ROW ═ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12 mt-6">
        {/* Recent Sales List */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Recent Transactions</h2>
            <Link href="/sales" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">View All</Link>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {loading ? (
              <div className="p-4 space-y-4"><SkeletonDark className="h-12 w-full" /><SkeletonDark className="h-12 w-full" /></div>
            ) : !stats?.recentSales?.length ? (
              <div className="p-8 text-center text-sm text-slate-400">No recent transactions.</div>
            ) : (
              stats.recentSales.slice(0, 5).map((sale) => (
                <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                        <ReceiptText size={18} />
                     </div>
                     <div>
                       <p className="text-sm font-bold text-slate-800">{sale.receiptNo}</p>
                       <p className="text-xs font-medium text-slate-500">{sale.customer?.name || 'Walk-in'} &bull; {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                     </div>
                  </div>
                  <div className="text-base font-bold text-slate-900">{money(sale.totalAmount)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Low Stock Alerts</h2>
            <Link href="/inventory" className="text-sm font-semibold text-rose-600 hover:text-rose-700">Manage Inventory</Link>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {loading ? (
              <div className="p-4 space-y-4"><SkeletonDark className="h-12 w-full" /><SkeletonDark className="h-12 w-full" /></div>
            ) : !stats?.lowStockProducts?.length ? (
              <div className="p-8 text-center text-sm text-slate-400">Inventory levels look healthy!</div>
            ) : (
              stats.lowStockProducts.slice(0, 5).map(product => {
                const isOut = product.totalStock <= 0;
                return (
                  <div key={product.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isOut ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-500")}>
                        <AlertTriangle size={18} />
                      </div>
                      <div className="max-w-[180px] sm:max-w-xs">
                        <p className="text-sm font-bold text-slate-800 truncate">{product.name}</p>
                        <p className="text-xs font-medium text-slate-500">{product.sku}</p>
                      </div>
                    </div>
                    <span className={cn("text-xs font-bold px-3 py-1.5 rounded-lg border", isOut ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-amber-50 text-amber-700 border-amber-100")}>
                      {isOut ? 'Depleted' : `${product.totalStock} left`}
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
