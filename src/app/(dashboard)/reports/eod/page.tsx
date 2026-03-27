'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  DollarSign, CreditCard, Banknote, Smartphone, Printer,
  CheckCircle, Clock, Package, TrendingUp, RefreshCw, Store,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

interface EODData {
  date: string;
  store: string;
  openingTime: string;
  closingTime: string;
  totalTransactions: number;
  totalRevenue: number;
  totalTax: number;
  totalDiscount: number;
  netRevenue: number;
  paymentBreakdown: { method: string; count: number; total: number }[];
  topItems: { name: string; qty: number; revenue: number }[];
  cashiersOnDuty: { name: string; sales: number; revenue: number }[];
  refunds: number;
  refundAmount: number;
  voids: number;
}

const money = (v: number) =>
  `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const paymentIcon: Record<string, React.ElementType> = {
  CASH: Banknote,
  CARD: CreditCard,
  MOBILE: Smartphone,
  UPI: Smartphone,
};

const paymentColor: Record<string, string> = {
  CASH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CARD: 'bg-blue-50 text-blue-700 border-blue-200',
  MOBILE: 'bg-amber-50 text-amber-700 border-amber-200',
  UPI: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function EODReportPage() {
  const { user, company } = useAuthStore();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<EODData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/eod?date=${date}`);
      setData(res.data);
    } catch {
      toast.error('Failed to generate EOD report');
    } finally {
      setLoading(false);
    }
  }, [date]);

  const handlePrint = () => window.print();

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">End of Day Report</h1>
          <p className="text-gray-500 text-sm mt-1">Daily closing summary for cashiers and managers</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Generate
          </button>
          {data && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-semibold transition"
            >
              <Printer size={16} />
              Print
            </button>
          )}
        </div>
      </div>

      {!data && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center">
          <Clock size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-semibold text-gray-900">No Report Generated</p>
          <p className="text-sm text-gray-500 mt-2">Select a date and click "Generate" to view the End of Day summary.</p>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-16 text-center">
          <RefreshCw size={32} className="mx-auto text-blue-400 animate-spin mb-4" />
          <p className="text-gray-500 text-sm">Calculating report...</p>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6" id="eod-print-area">
          {/* Print Header */}
          <div className="hidden print:block text-center border-b border-gray-200 pb-4 mb-6">
            <h1 className="text-xl font-bold">{company?.name || 'POS System'}</h1>
            <p className="text-sm text-gray-600 mt-1">End of Day Report — {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p className="text-xs text-gray-400 mt-1">Generated: {new Date().toLocaleString()}</p>
          </div>

          {/* Summary Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white print:bg-blue-600 print:border print:border-blue-700">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Store size={16} className="opacity-80" />
                  <span className="text-sm opacity-80">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <p className="text-3xl font-extrabold">{money(data.totalRevenue)}</p>
                <p className="text-sm opacity-80 mt-1">Total Revenue · {data.totalTransactions} transactions</p>
              </div>
              <div className="flex items-center gap-2 bg-white/20 rounded-lg px-4 py-2 print:border print:border-white">
                <CheckCircle size={18} />
                <span className="text-sm font-semibold">Day Closed</span>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Gross Revenue', value: money(data.totalRevenue), icon: DollarSign, color: 'blue' },
              { label: 'Tax Collected', value: money(data.totalTax), icon: TrendingUp, color: 'indigo' },
              { label: 'Discounts Given', value: money(data.totalDiscount), icon: Package, color: 'amber' },
              { label: 'Net Revenue', value: money(data.netRevenue), icon: CheckCircle, color: 'green' },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{card.label}</p>
                <p className="text-2xl font-extrabold text-gray-900 mt-2">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Breakdown */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <CreditCard size={16} className="text-blue-500" />
                <h3 className="font-bold text-gray-900">Payment Method Breakdown</h3>
              </div>
              <div className="p-5 space-y-3">
                {data.paymentBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No payments recorded</p>
                ) : (
                  data.paymentBreakdown.map((pm) => {
                    const Icon = paymentIcon[pm.method] || CreditCard;
                    return (
                      <div key={pm.method} className={cn('flex items-center justify-between p-3 rounded-lg border', paymentColor[pm.method] || 'bg-gray-50 text-gray-700 border-gray-200')}>
                        <div className="flex items-center gap-3">
                          <Icon size={18} />
                          <div>
                            <p className="text-sm font-semibold">{pm.method}</p>
                            <p className="text-xs opacity-70">{pm.count} transactions</p>
                          </div>
                        </div>
                        <p className="text-base font-bold">{money(pm.total)}</p>
                      </div>
                    );
                  })
                )}
              </div>
              {/* Expected Cash in Drawer */}
              {data.paymentBreakdown.find(p => p.method === 'CASH') && (
                <div className="px-5 pb-5">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Expected Cash in Drawer</p>
                    <p className="text-xl font-extrabold text-amber-900 mt-1">
                      {money(data.paymentBreakdown.find(p => p.method === 'CASH')?.total || 0)}
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">Count physical cash and compare this amount</p>
                  </div>
                </div>
              )}
            </div>

            {/* Staff Performance */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <TrendingUp size={16} className="text-purple-500" />
                <h3 className="font-bold text-gray-900">Cashier Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/60">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Cashier</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Sales</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.cashiersOnDuty.length === 0 ? (
                      <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-400">No cashiers on duty</td></tr>
                    ) : (
                      data.cashiersOnDuty.map((c) => (
                        <tr key={c.name} className="hover:bg-gray-50/70">
                          <td className="px-5 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                          <td className="px-5 py-3 text-sm text-gray-600 text-right">{c.sales}</td>
                          <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right">{money(c.revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Top Selling Items */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <Package size={16} className="text-green-500" />
              <h3 className="font-bold text-gray-900">Top Selling Items Today</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/60">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">#</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Product</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Qty Sold</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.topItems.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">No items sold today</td></tr>
                  ) : (
                    data.topItems.map((item, i) => (
                      <tr key={item.name} className="hover:bg-gray-50/70">
                        <td className="px-5 py-3 text-sm text-gray-400 font-medium">{i + 1}</td>
                        <td className="px-5 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-5 py-3 text-sm text-gray-600 text-right">{item.qty}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right">{money(item.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Refunds & Voids Summary */}
          {(data.refunds > 0 || data.voids > 0) && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h3 className="font-bold text-red-900 mb-3">Adjustments</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Refunds</p>
                  <p className="text-xl font-extrabold text-red-900 mt-1">{data.refunds} <span className="text-sm font-normal">({money(data.refundAmount)})</span></p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Voided Transactions</p>
                  <p className="text-xl font-extrabold text-red-900 mt-1">{data.voids}</p>
                </div>
              </div>
            </div>
          )}

          {/* Print Footer */}
          <div className="hidden print:block text-center text-xs text-gray-400 border-t border-gray-200 pt-4 mt-8">
            <p>This report was generated by {company?.name || 'POS System'} · {new Date().toLocaleString()}</p>
            <p className="mt-1">Cashier Signature: _____________ &nbsp;&nbsp; Manager Signature: _____________</p>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #eod-print-area, #eod-print-area * { visibility: visible; }
          #eod-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      ` }} />
    </div>
  );
}
