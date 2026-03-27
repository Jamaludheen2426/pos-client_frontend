'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  Download,
  Users,
  BarChart3,
  FileText,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Filter,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Period = 'today' | 'week' | 'month' | 'year';
type Tab = 'sales' | 'staff' | 'inventory' | 'tax';
type StockFilter = 'all' | 'low' | 'out';

interface SalesReport {
  salesSummary: {
    totalSales: number;
    totalRevenue: number;
    avgOrderValue: number;
    totalItemsSold: number;
  };
  topProducts: { id: number; name: string; totalSold: number; revenue: number }[];
  salesByPayment: { method: string; count: number; total: number }[];
  dailySales: { date: string; count: number; revenue: number }[];
}

interface StaffRow {
  id: number;
  name: string;
  role: string;
  totalSales: number;
  revenue: number;
  avgOrderValue: number;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  category?: { name: string } | string;
  basePrice: number;
  price?: number;
}

interface StockItem {
  productId: number;
  quantity: number;
}

interface SaleRecord {
  id: number;
  receiptNumber?: string;
  createdAt: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  taxRate?: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const money = (v: number) =>
  `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const periodLabel: Record<Period, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
};

const periodDates = (p: Period) => {
  const now = new Date();
  let from: Date;
  switch (p) {
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week': {
      const day = now.getDay();
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
      break;
    }
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      from = new Date(now.getFullYear(), 0, 1);
      break;
  }
  return {
    from: from.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
  };
};

const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: 'sales', label: 'Sales Overview', icon: BarChart3 },
  { key: 'staff', label: 'Staff Performance', icon: Users },
  { key: 'inventory', label: 'Inventory Report', icon: Package },
  { key: 'tax', label: 'Tax Report', icon: FileText },
];

/* ------------------------------------------------------------------ */
/*  Gradient map for metric cards                                      */
/* ------------------------------------------------------------------ */

const gradientMap: Record<string, string> = {
  'bg-blue-50 text-blue-600': 'from-blue-500 to-blue-400',
  'bg-green-50 text-green-600': 'from-green-500 to-green-400',
  'bg-purple-50 text-purple-600': 'from-purple-500 to-purple-400',
  'bg-orange-50 text-orange-600': 'from-orange-500 to-orange-400',
  'bg-amber-50 text-amber-600': 'from-amber-500 to-amber-400',
  'bg-red-50 text-red-600': 'from-red-500 to-red-400',
  'bg-indigo-50 text-indigo-600': 'from-indigo-500 to-indigo-400',
};

/* ------------------------------------------------------------------ */
/*  Skeleton Loader                                                    */
/* ------------------------------------------------------------------ */

const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-lg bg-gray-200/70', className)} />
);

/* ------------------------------------------------------------------ */
/*  Metric Card                                                        */
/* ------------------------------------------------------------------ */

const MetricCard = ({
  icon: Icon,
  label,
  value,
  color,
  loading,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string | number;
  color: string;
  loading: boolean;
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 relative overflow-hidden">
    {/* Gradient accent bar */}
    <div className={cn('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r', gradientMap[color] || 'from-gray-400 to-gray-300')} />
    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', color)}>
      <Icon size={20} />
    </div>
    {loading ? (
      <SkeletonBlock className="h-8 w-28 mb-2" />
    ) : (
      <p className="text-[28px] font-extrabold text-gray-900 leading-tight">{value}</p>
    )}
    <p className="text-sm text-gray-500 mt-1">{label}</p>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('sales');
  const [period, setPeriod] = useState<Period>('month');

  /* ---- Sales state ---- */
  const [salesData, setSalesData] = useState<SalesReport | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);

  /* ---- Staff state ---- */
  const [staffData, setStaffData] = useState<StaffRow[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  /* ---- Inventory state ---- */
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');

  /* ---- Tax state ---- */
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [taxLoading, setTaxLoading] = useState(false);

  /* ================================================================ */
  /*  Data fetching                                                    */
  /* ================================================================ */

  // Sales
  useEffect(() => {
    if (activeTab !== 'sales') return;
    setSalesLoading(true);
    api
      .get(`/reports/summary?period=${period}`)
      .then(({ data }) => setSalesData(data))
      .catch(() => toast.error('Failed to load sales report'))
      .finally(() => setSalesLoading(false));
  }, [period, activeTab]);

  // Staff
  useEffect(() => {
    if (activeTab !== 'staff') return;
    setStaffLoading(true);
    api
      .get(`/reports/staff-performance?period=${period}`)
      .then(({ data }) => {
        const rows: StaffRow[] = Array.isArray(data) ? data : data?.data ?? [];
        rows.sort((a, b) => Number(b.revenue) - Number(a.revenue));
        setStaffData(rows);
      })
      .catch(() => toast.error('Failed to load staff performance'))
      .finally(() => setStaffLoading(false));
  }, [period, activeTab]);

  // Inventory
  useEffect(() => {
    if (activeTab !== 'inventory') return;
    setInvLoading(true);
    Promise.all([
      api.get('/products?limit=1000'),
      api.get('/products/stock'),
    ])
      .then(([prodRes, stockRes]) => {
        const prods: Product[] = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data?.data ?? [];
        const stk: StockItem[] = Array.isArray(stockRes.data) ? stockRes.data : stockRes.data?.data ?? [];
        setProducts(prods);
        setStock(stk);
      })
      .catch(() => toast.error('Failed to load inventory data'))
      .finally(() => setInvLoading(false));
  }, [activeTab]);

  // Tax — fetch sales for period
  useEffect(() => {
    if (activeTab !== 'tax') return;
    setTaxLoading(true);
    const { from, to } = periodDates(period);
    api
      .get(`/sales?limit=1000&from=${from}&to=${to}`)
      .then(({ data }) => {
        const rows: SaleRecord[] = Array.isArray(data) ? data : data?.data ?? [];
        setSales(rows);
      })
      .catch(() => toast.error('Failed to load tax data'))
      .finally(() => setTaxLoading(false));
  }, [period, activeTab]);

  /* ================================================================ */
  /*  Computed data                                                    */
  /* ================================================================ */

  // Inventory computations
  const stockMap = useMemo(() => {
    const m = new Map<number, number>();
    stock.forEach((s) => m.set(s.productId, s.quantity));
    return m;
  }, [stock]);

  const inventoryRows = useMemo(() => {
    return products.map((p) => {
      const qty = stockMap.get(p.id) ?? 0;
      const price = p.basePrice ?? p.price ?? 0;
      const value = qty * Number(price);
      let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
      if (qty <= 0) status = 'Out of Stock';
      else if (qty <= 10) status = 'Low Stock';
      return { ...p, qty, value, status, price: Number(price) };
    });
  }, [products, stockMap]);

  const filteredInventory = useMemo(() => {
    if (stockFilter === 'low') return inventoryRows.filter((r) => r.status === 'Low Stock');
    if (stockFilter === 'out') return inventoryRows.filter((r) => r.status === 'Out of Stock');
    return inventoryRows;
  }, [inventoryRows, stockFilter]);

  const invMetrics = useMemo(() => {
    const totalProducts = inventoryRows.length;
    const totalValue = inventoryRows.reduce((s, r) => s + r.value, 0);
    const lowStock = inventoryRows.filter((r) => r.status === 'Low Stock').length;
    const outOfStock = inventoryRows.filter((r) => r.status === 'Out of Stock').length;
    return { totalProducts, totalValue, lowStock, outOfStock };
  }, [inventoryRows]);

  // Tax computations
  const taxMetrics = useMemo(() => {
    const totalTax = sales.reduce((s, r) => s + Number(r.taxAmount || 0), 0);
    const byRate = new Map<number, { count: number; tax: number }>();
    sales.forEach((r) => {
      const rate = r.taxRate ?? (Number(r.subtotal) > 0 ? Math.round((Number(r.taxAmount || 0) / Number(r.subtotal)) * 10000) / 100 : 0);
      const existing = byRate.get(rate) || { count: 0, tax: 0 };
      existing.count += 1;
      existing.tax += Number(r.taxAmount || 0);
      byRate.set(rate, existing);
    });
    return { totalTax, byRate: Array.from(byRate.entries()).sort((a, b) => b[0] - a[0]) };
  }, [sales]);

  /* ================================================================ */
  /*  Actions                                                          */
  /* ================================================================ */

  const handleExportExcel = useCallback(() => {
    const { from, to } = periodDates(period);
    const baseUrl = api.defaults.baseURL || '';
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
    window.open(`${baseUrl}/reports/download/excel?from=${from}&to=${to}&token=${token}`, '_blank');
  }, [period]);

  const handleExportInventoryCSV = useCallback(() => {
    const header = ['Product Name', 'SKU', 'Category', 'Price', 'Stock Qty', 'Stock Value', 'Status'];
    const rows = filteredInventory.map((r) => [
      r.name,
      r.sku || '',
      typeof r.category === 'object' ? r.category?.name || '' : r.category || '',
      r.price.toFixed(2),
      r.qty.toString(),
      r.value.toFixed(2),
      r.status,
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Inventory CSV exported');
  }, [filteredInventory]);

  /* ================================================================ */
  /*  Shared UI pieces                                                 */
  /* ================================================================ */

  const PeriodSelector = () => (
    <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
      {(['today', 'week', 'month', 'year'] as const).map((p) => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          className={cn(
            'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
            period === p
              ? 'bg-[#3B82F6] text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
          )}
        >
          {periodLabel[p]}
        </button>
      ))}
    </div>
  );

  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      'In Stock': 'bg-green-50 text-green-700 border-green-200',
      'Low Stock': 'bg-amber-50 text-amber-700 border-amber-200',
      'Out of Stock': 'bg-red-50 text-red-700 border-red-200',
    };
    return (
      <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border', styles[status] || 'bg-gray-50 text-gray-600 border-gray-200')}>
        {status}
      </span>
    );
  };

  const EmptyState = ({ cols, text = 'No data available', icon: EmptyIcon = Package }: { cols: number; text?: string; icon?: typeof Package }) => (
    <tr>
      <td colSpan={cols} className="py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
            <EmptyIcon size={22} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-400">{text}</p>
          <p className="text-xs text-gray-300 mt-1">Data will appear here once available</p>
        </div>
      </td>
    </tr>
  );

  const SkeletonRow = ({ cols }: { cols: number }) => (
    <tr>
      <td colSpan={cols} className="py-6 px-5">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              {Array.from({ length: Math.min(cols, 4) }).map((_, j) => (
                <SkeletonBlock key={j} className={cn('h-4', j === 0 ? 'w-32' : 'w-20')} />
              ))}
            </div>
          ))}
        </div>
      </td>
    </tr>
  );

  const EmptyCard = ({ text = 'No data available', icon: EmptyIcon = Package }: { text?: string; icon?: typeof Package }) => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
        <EmptyIcon size={22} className="text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-400">{text}</p>
      <p className="text-xs text-gray-300 mt-1">Data will appear here once available</p>
    </div>
  );

  const CardSkeleton = () => (
    <div className="px-5 py-8 space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonBlock className="w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
          <SkeletonBlock className="h-4 w-16" />
        </div>
      ))}
    </div>
  );

  /* ================================================================ */
  /*  TAB: Sales Overview                                              */
  /* ================================================================ */

  const renderSales = () => {
    const summaryCards = [
      { label: 'Total Sales', value: salesData?.salesSummary.totalSales ?? 0, icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
      { label: 'Total Revenue', value: salesData ? money(salesData.salesSummary.totalRevenue) : '$0.00', icon: DollarSign, color: 'bg-green-50 text-green-600' },
      { label: 'Avg Order Value', value: salesData ? money(salesData.salesSummary.avgOrderValue) : '$0.00', icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
      { label: 'Items Sold', value: salesData?.salesSummary.totalItemsSold ?? 0, icon: Package, color: 'bg-orange-50 text-orange-600' },
    ];

    const maxPayment = Math.max(...(salesData?.salesByPayment?.map((s) => s.total) || [0]));
    const paymentColors: Record<string, string> = { CASH: '#22C55E', CARD: '#3B82F6', MOBILE: '#F59E0B' };
    const maxSold = Math.max(...(salesData?.topProducts?.slice(0, 10).map((p) => p.totalSold) || [0]));

    return (
      <>
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {summaryCards.map((c) => (
            <MetricCard key={c.label} icon={c.icon} label={c.label} value={c.value} color={c.color} loading={salesLoading} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-500" />
                <h3 className="font-bold text-base text-gray-900">Top Selling Products</h3>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {salesLoading ? (
                <CardSkeleton />
              ) : !salesData?.topProducts?.length ? (
                <EmptyCard text="No products sold yet" icon={ShoppingCart} />
              ) : (
                salesData.topProducts.slice(0, 10).map((product, i) => {
                  const soldPct = maxSold > 0 ? (product.totalSold / maxSold) * 100 : 0;
                  const rankColors = ['bg-yellow-400 text-white', 'bg-gray-400 text-white', 'bg-amber-600 text-white'];
                  return (
                    <div key={product.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/70 transition-colors">
                      <span className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                        i < 3 ? rankColors[i] : 'bg-gray-100 text-gray-500',
                      )}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[120px]">
                            <div
                              className="h-1.5 rounded-full bg-blue-400 transition-all"
                              style={{ width: `${soldPct}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400">{product.totalSold} units</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{money(product.revenue)}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-green-500" />
                <h3 className="font-bold text-base text-gray-900">Sales by Payment Method</h3>
              </div>
            </div>
            <div className="p-5">
              {salesLoading ? (
                <div className="space-y-5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between">
                        <SkeletonBlock className="h-4 w-20" />
                        <SkeletonBlock className="h-4 w-28" />
                      </div>
                      <SkeletonBlock className="h-2.5 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : !salesData?.salesByPayment?.length ? (
                <EmptyCard text="No payment data yet" icon={DollarSign} />
              ) : (
                <div className="space-y-4">
                  {salesData.salesByPayment.map((item) => {
                    const pct = maxPayment > 0 ? (item.total / maxPayment) * 100 : 0;
                    return (
                      <div key={item.method}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium text-gray-700">{item.method}</span>
                          <span className="text-gray-500">
                            {item.count} sales &mdash; {money(item.total)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div
                            className="h-2.5 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: paymentColors[item.method] || '#6B7280' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Daily Sales Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow lg:col-span-2">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-purple-500" />
                <h3 className="font-bold text-base text-gray-900">Daily Sales Breakdown</h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Transactions</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {salesLoading ? (
                    <SkeletonRow cols={3} />
                  ) : !salesData?.dailySales?.length ? (
                    <EmptyState cols={3} icon={BarChart3} />
                  ) : (
                    salesData.dailySales.map((day) => (
                      <tr key={day.date} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-gray-900">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600 text-right">{day.count}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right">{money(day.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </>
    );
  };

  /* ================================================================ */
  /*  TAB: Staff Performance                                           */
  /* ================================================================ */

  const renderStaff = () => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-blue-500" />
          <h3 className="font-bold text-base text-gray-900">Staff Performance</h3>
        </div>
        <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">{staffData.length} staff members</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/60">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">#</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Staff Name</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Role</th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Total Sales</th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Revenue</th>
              <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Avg Order Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {staffLoading ? (
              <SkeletonRow cols={6} />
            ) : !staffData.length ? (
              <EmptyState cols={6} text="No staff data available" icon={Users} />
            ) : (
              staffData.map((s, i) => (
                <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3 text-sm text-gray-400 font-medium">{i + 1}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                  <td className="px-5 py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {s.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600 text-right">{s.totalSales}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right">{money(s.revenue)}</td>
                  <td className="px-5 py-3 text-sm text-gray-600 text-right">{money(s.avgOrderValue)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  /* ================================================================ */
  /*  TAB: Inventory                                                   */
  /* ================================================================ */

  const renderInventory = () => (
    <>
      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <MetricCard icon={Package} label="Total Products" value={invMetrics.totalProducts} color="bg-blue-50 text-blue-600" loading={invLoading} />
        <MetricCard icon={DollarSign} label="Total Stock Value" value={money(invMetrics.totalValue)} color="bg-green-50 text-green-600" loading={invLoading} />
        <MetricCard icon={AlertTriangle} label="Low Stock" value={invMetrics.lowStock} color="bg-amber-50 text-amber-600" loading={invLoading} />
        <MetricCard icon={XCircle} label="Out of Stock" value={invMetrics.outOfStock} color="bg-red-50 text-red-600" loading={invLoading} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-blue-500" />
            <h3 className="font-bold text-base text-gray-900">Inventory Details</h3>
          </div>
          <div className="flex items-center gap-3">
            {/* Stock filter */}
            <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-xl p-1">
              {([
                { key: 'all' as StockFilter, label: 'All' },
                { key: 'low' as StockFilter, label: 'Low Stock' },
                { key: 'out' as StockFilter, label: 'Out of Stock' },
              ]).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStockFilter(f.key)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                    stockFilter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleExportInventoryCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Product</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">SKU</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Category</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Price</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Stock Qty</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Stock Value</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invLoading ? (
                <SkeletonRow cols={7} />
              ) : !filteredInventory.length ? (
                <EmptyState cols={7} text="No inventory items found" icon={Package} />
              ) : (
                filteredInventory.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate">{r.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 font-mono">{r.sku || '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {typeof r.category === 'object' ? r.category?.name || '—' : r.category || '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600 text-right">{money(r.price)}</td>
                    <td className="px-5 py-3 text-sm text-gray-900 font-medium text-right">{r.qty}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right">{money(r.value)}</td>
                    <td className="px-5 py-3 text-center">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!invLoading && filteredInventory.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {filteredInventory.length} of {inventoryRows.length} products
          </div>
        )}
      </div>
    </>
  );

  /* ================================================================ */
  /*  TAB: Tax Report                                                  */
  /* ================================================================ */

  const renderTax = () => (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <MetricCard
          icon={DollarSign}
          label="Total Tax Collected"
          value={money(taxMetrics.totalTax)}
          color="bg-indigo-50 text-indigo-600"
          loading={taxLoading}
        />
        <MetricCard
          icon={FileText}
          label="Total Transactions"
          value={sales.length}
          color="bg-blue-50 text-blue-600"
          loading={taxLoading}
        />
        <MetricCard
          icon={TrendingUp}
          label="Avg Tax per Sale"
          value={sales.length > 0 ? money(taxMetrics.totalTax / sales.length) : '$0.00'}
          color="bg-green-50 text-green-600"
          loading={taxLoading}
        />
        <MetricCard
          icon={BarChart3}
          label="Tax Rates Used"
          value={taxMetrics.byRate.length}
          color="bg-purple-50 text-purple-600"
          loading={taxLoading}
        />
      </div>

      {/* Tax rate breakdown */}
      {taxMetrics.byRate.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow mb-6">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-500" />
              <h3 className="font-bold text-base text-gray-900">Tax Breakdown by Rate</h3>
            </div>
          </div>
          <div className="p-5">
            <div className="space-y-3">
              {taxMetrics.byRate.map(([rate, info]) => {
                const maxTax = Math.max(...taxMetrics.byRate.map(([, v]) => v.tax));
                const pct = maxTax > 0 ? (info.tax / maxTax) * 100 : 0;
                return (
                  <div key={rate}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-gray-700">{rate}% Tax Rate</span>
                      <span className="text-gray-500">
                        {info.count} transactions &mdash; {money(info.tax)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all bg-indigo-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sales with tax table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-indigo-500" />
            <h3 className="font-bold text-base text-gray-900">Tax Detail</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/60">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Receipt #</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Subtotal</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Tax Amount</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {taxLoading ? (
                <SkeletonRow cols={5} />
              ) : !sales.length ? (
                <EmptyState cols={5} text="No tax records found" icon={FileText} />
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-gray-900">{s.receiptNumber || '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 text-right">{money(s.subtotal)}</td>
                    <td className="px-5 py-3 text-sm font-medium text-indigo-600 text-right">{money(s.taxAmount)}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right">{money(s.totalAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!taxLoading && sales.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50/80 font-semibold">
                  <td className="px-5 py-3 text-sm text-gray-900" colSpan={2}>
                    Total
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-900 text-right">
                    {money(sales.reduce((s, r) => s + Number(r.subtotal || 0), 0))}
                  </td>
                  <td className="px-5 py-3 text-sm text-indigo-600 text-right">
                    {money(taxMetrics.totalTax)}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-900 text-right">
                    {money(sales.reduce((s, r) => s + Number(r.totalAmount || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  );

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Sales analytics, staff performance, inventory and tax reports</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'sales' && (
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-xl transition hover:opacity-90 shadow-sm"
              style={{ backgroundColor: '#3B82F6' }}
            >
              <Download size={16} />
              Export Excel
            </button>
          )}
          <PeriodSelector />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
                  isActive
                    ? 'border-[#3B82F6] text-[#3B82F6] bg-blue-50/40'
                    : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200 hover:bg-gray-50/50',
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'sales' && renderSales()}
      {activeTab === 'staff' && renderStaff()}
      {activeTab === 'inventory' && renderInventory()}
      {activeTab === 'tax' && renderTax()}
    </div>
  );
}
