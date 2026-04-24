'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Download, Banknote, CreditCard, Smartphone, BarChart3, Users, Package, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

type Period = 'today' | 'week' | 'month' | 'year';
type Tab = 'sales' | 'staff' | 'inventory';

interface SalesReport {
  salesSummary: { totalSales: number; totalRevenue: number; avgOrderValue: number; totalItemsSold: number };
  topProducts: { id: number; name: string; totalSold: number; revenue: number }[];
  salesByPayment: { method: string; count: number; total: number }[];
  dailySales: { date: string; count: number; revenue: number }[];
}
interface StaffRow { id: number; name: string; role: string; totalSales: number; revenue: number; avgOrderValue: number; }

const fmt = (v: number) => `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const payIcon: Record<string, React.ElementType> = { CASH: Banknote, CARD: CreditCard, UPI: Smartphone, MOBILE: Smartphone };
const payColor: Record<string, string> = { CASH: '#008060', CARD: '#2C6ECB', UPI: '#B25000', MOBILE: '#B25000' };

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
];

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'sales', label: 'Sales', icon: BarChart3 },
  { id: 'staff', label: 'Staff performance', icon: Users },
  { id: 'inventory', label: 'Inventory', icon: Package },
];

const Skel = ({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) => (
  <div className={cn('animate-pulse bg-[#E1E3E5] rounded', w, h)} />
);

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('month');
  const [tab, setTab] = useState<Tab>('sales');
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [staffReport, setStaffReport] = useState<StaffRow[]>([]);
  const [stockReport, setStockReport] = useState<{ productId: number; product: { name: string; sku: string; category?: string }; store: { name: string }; qty: number; lowStockAt: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const [salesRes, staffRes, stockRes] = await Promise.allSettled([
      api.get(`/reports/summary?period=${period}`),
      api.get(`/reports/staff-performance?period=${period}`),
      api.get('/products/stock'),
    ]);
    if (salesRes.status === 'fulfilled') setSalesReport(salesRes.value.data);
    else toast.error('Failed to load sales report');
    if (staffRes.status === 'fulfilled') setStaffReport(staffRes.value.data);
    if (stockRes.status === 'fulfilled') setStockReport(stockRes.value.data || []);
    setLoading(false);
  }, [period]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const to = new Date().toISOString();
      const fromDate = new Date();
      if (period === 'today') fromDate.setHours(0, 0, 0, 0);
      else if (period === 'week') fromDate.setDate(fromDate.getDate() - 7);
      else if (period === 'year') fromDate.setFullYear(fromDate.getFullYear() - 1);
      else fromDate.setMonth(fromDate.getMonth() - 1);
      const from = fromDate.toISOString();

      const res = await api.get(`/reports/download/excel?type=sales&from=${from}&to=${to}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `sales-report-${period}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); } finally { setDownloading(false); }
  };

  const lowStock = stockReport.filter((s) => Number(s.qty) <= (s.lowStockAt || 10));

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#202223]">Reports</h1>
          <p className="text-sm text-[#6D7175] mt-0.5">Analytics and business performance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadReports} disabled={loading} className="flex items-center gap-2 border border-[#C9CCCF] bg-white hover:bg-[#F6F6F7] text-[#202223] px-3 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          </button>
          <button onClick={downloadExcel} disabled={downloading} className="flex items-center gap-2 bg-[#008060] hover:bg-[#006E52] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
            <Download size={14} />{downloading ? 'Downloading...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 p-1 bg-[#F6F6F7] rounded-lg border border-[#E1E3E5] w-fit">
        {PERIODS.map(({ id, label }) => (
          <button key={id} onClick={() => setPeriod(id)}
            className={cn('px-4 py-1.5 rounded-md text-sm font-semibold transition-colors', period === id ? 'bg-white shadow-sm text-[#202223]' : 'text-[#6D7175] hover:text-[#202223]')}>
            {label}
          </button>
        ))}
      </div>

      {/* KPI summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total revenue', value: loading ? null : fmt(salesReport?.salesSummary?.totalRevenue ?? 0) },
          { label: 'Orders', value: loading ? null : String(salesReport?.salesSummary?.totalSales ?? 0) },
          { label: 'Avg order value', value: loading ? null : fmt(salesReport?.salesSummary?.avgOrderValue ?? 0) },
          { label: 'Items sold', value: loading ? null : String(salesReport?.salesSummary?.totalItemsSold ?? 0) },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-[#E1E3E5] p-5">
            <p className="text-xs font-semibold text-[#6D7175] uppercase tracking-wide mb-2">{c.label}</p>
            {c.value === null ? <Skel h="h-8" w="w-28" /> : <p className="text-2xl font-bold text-[#202223]">{c.value}</p>}
          </div>
        ))}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 p-1 bg-[#F6F6F7] rounded-lg border border-[#E1E3E5] w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors', tab === id ? 'bg-white shadow-sm text-[#202223]' : 'text-[#6D7175] hover:text-[#202223]')}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Sales tab */}
      {tab === 'sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top products */}
          <div className="bg-white rounded-xl border border-[#E1E3E5] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E1E3E5]">
              <p className="text-sm font-semibold text-[#202223]">Top products</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-[#F6F6F7] border-b border-[#E1E3E5]">
                  <th className="px-5 py-3 text-xs font-semibold text-[#6D7175] uppercase tracking-wide text-left">Product</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[#6D7175] uppercase tracking-wide text-right">Units</th>
                  <th className="px-5 py-3 text-xs font-semibold text-[#6D7175] uppercase tracking-wide text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E3E5]">
                {loading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td className="px-5 py-3.5" colSpan={3}><Skel /></td></tr>
                )) : (salesReport?.topProducts || []).slice(0, 10).map((p) => (
                  <tr key={p.id} className="hover:bg-[#F6F6F7] transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-[#202223]">{p.name}</td>
                    <td className="px-5 py-3 text-sm text-[#6D7175] text-right">{Number(p.totalSold)}</td>
                    <td className="px-5 py-3 text-sm font-bold text-[#202223] text-right">{fmt(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment breakdown */}
          <div className="bg-white rounded-xl border border-[#E1E3E5] p-5">
            <p className="text-sm font-semibold text-[#202223] mb-4">Sales by payment method</p>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skel key={i} />)}</div>
            ) : (salesReport?.salesByPayment || []).length === 0 ? (
              <p className="text-sm text-[#6D7175]">No data for this period</p>
            ) : (
              <div className="space-y-4">
                {(salesReport?.salesByPayment || []).map((p) => {
                  const Icon = payIcon[p.method] || Banknote;
                  const color = payColor[p.method] || '#6D7175';
                  const total = (salesReport?.salesByPayment || []).reduce((s, d) => s + d.total, 0) || 1;
                  const pct = Math.round((p.total / total) * 100);
                  return (
                    <div key={p.method}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Icon size={14} style={{ color }} />
                          <span className="text-sm font-medium text-[#202223]">{p.method}</span>
                          <span className="text-xs text-[#6D7175]">{p.count} orders</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#6D7175]">{pct}%</span>
                          <span className="text-sm font-bold text-[#202223]">{fmt(p.total)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-[#F1F1F1] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Staff tab */}
      {tab === 'staff' && (
        <div className="bg-white rounded-xl border border-[#E1E3E5] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F6F6F7] border-b border-[#E1E3E5]">
                {['Staff member', 'Role', 'Orders', 'Revenue', 'Avg order'].map((h, i) => (
                  <th key={h} className={cn('px-5 py-3 text-xs font-semibold text-[#6D7175] uppercase tracking-wide', i > 1 ? 'text-right' : 'text-left')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E3E5]">
              {loading ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-5 py-4"><Skel /></td>)}</tr>
              )) : staffReport.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-sm text-[#6D7175]">No staff data for this period</td></tr>
              ) : staffReport.map((s) => (
                <tr key={s.id} className="hover:bg-[#F6F6F7] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{s.name.charAt(0)}</div>
                      <span className="text-sm font-semibold text-[#202223]">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F6F6F7] text-[#6D7175]">{s.role}</span></td>
                  <td className="px-5 py-4 text-sm text-[#202223] text-right font-semibold">{s.totalSales}</td>
                  <td className="px-5 py-4 text-sm font-bold text-[#202223] text-right">{fmt(s.revenue)}</td>
                  <td className="px-5 py-4 text-sm text-[#6D7175] text-right">{fmt(s.avgOrderValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inventory tab */}
      {tab === 'inventory' && (
        <div className="bg-white rounded-xl border border-[#E1E3E5] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E1E3E5] flex items-center justify-between">
            <p className="text-sm font-semibold text-[#202223]">Low stock alerts</p>
            <span className="text-xs font-semibold text-[#D72C0D] bg-[#FFF4F4] px-2.5 py-1 rounded-full">{lowStock.length} items</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-[#F6F6F7] border-b border-[#E1E3E5]">
                {['Product', 'SKU', 'Store', 'Stock', 'Threshold'].map((h, i) => (
                  <th key={h} className={cn('px-5 py-3 text-xs font-semibold text-[#6D7175] uppercase tracking-wide', i >= 3 ? 'text-right' : 'text-left')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E3E5]">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-5 py-3.5"><Skel /></td>)}</tr>
              )) : lowStock.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-sm text-[#6D7175]">All stock levels look healthy</td></tr>
              ) : lowStock.map((s) => {
                const qty = Number(s.qty);
                const isOut = qty <= 0;
                return (
                  <tr key={`${s.productId}-${s.store?.name}`} className="hover:bg-[#F6F6F7] transition-colors">
                    <td className="px-5 py-3 text-sm font-semibold text-[#202223]">{s.product?.name}</td>
                    <td className="px-5 py-3 text-sm text-[#6D7175] font-mono">{s.product?.sku}</td>
                    <td className="px-5 py-3 text-sm text-[#6D7175]">{s.store?.name || '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={cn('text-sm font-bold', isOut ? 'text-[#D72C0D]' : 'text-[#B25000]')}>{qty}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', isOut ? 'bg-[#FFF4F4] text-[#D72C0D]' : 'bg-[#FFF4E4] text-[#B25000]')}>
                        {isOut ? 'Out of stock' : `≤ ${s.lowStockAt}`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
