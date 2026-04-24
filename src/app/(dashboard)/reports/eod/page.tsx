'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { DollarSign, CreditCard, Banknote, Smartphone, Printer, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface EODData {
  date: string; totalTransactions: number; totalRevenue: number; totalTax: number;
  totalDiscount: number; netRevenue: number;
  paymentBreakdown: { method: string; count: number; total: number }[];
  topItems: { name: string; qty: number; revenue: number }[];
  cashiersOnDuty: { name: string; sales: number; revenue: number }[];
  refunds: number; refundAmount: number; voids: number;
}

const fmt = (v: number) => `$${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const payIcon: Record<string, React.ElementType> = { CASH: Banknote, CARD: CreditCard, UPI: Smartphone, MOBILE: Smartphone };
const payColor: Record<string, string> = { CASH: 'text-[#008060]', CARD: 'text-[#2C6ECB]', UPI: 'text-[#B25000]', MOBILE: 'text-[#B25000]' };

export default function EODReportPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<EODData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get(`/reports/eod?date=${date}`); setData(r.data); }
    catch { toast.error('Failed to generate report'); } finally { setLoading(false); }
  }, [date]);

  return (
    <div className="p-6 space-y-5 print:p-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-[#202223]">End of day report</h1>
          <p className="text-sm text-[#6D7175] mt-0.5">Daily closing summary</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="border border-[#C9CCCF] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] text-[#202223]" />
          <button onClick={fetchReport} disabled={loading} className="flex items-center gap-2 bg-[#008060] hover:bg-[#006E52] text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />Generate
          </button>
          {data && <button onClick={() => window.print()} className="flex items-center gap-2 border border-[#C9CCCF] bg-white hover:bg-[#F6F6F7] text-[#202223] px-4 py-2 rounded-lg text-sm font-semibold transition-colors"><Printer size={14} />Print</button>}
        </div>
      </div>

      {!data ? (
        <div className="bg-white rounded-xl border border-[#E1E3E5] py-20 text-center">
          <DollarSign size={32} className="text-[#C4CDD5] mx-auto mb-3" />
          <p className="text-sm font-medium text-[#6D7175]">Select a date and click Generate to view the report</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Transactions', value: String(data.totalTransactions), sub: `${data.refunds} refunds · ${data.voids} voids` },
              { label: 'Gross revenue', value: fmt(data.totalRevenue), sub: `Tax: ${fmt(data.totalTax)}` },
              { label: 'Discounts given', value: fmt(data.totalDiscount), sub: '' },
              { label: 'Net revenue', value: fmt(data.netRevenue), sub: 'Revenue minus tax & discount', highlight: true },
            ].map((c) => (
              <div key={c.label} className={cn('rounded-xl border p-5', c.highlight ? 'bg-[#EAF5F0] border-[#008060]/20' : 'bg-white border-[#E1E3E5]')}>
                <p className={cn('text-xs font-semibold uppercase tracking-wide mb-2', c.highlight ? 'text-[#008060]' : 'text-[#6D7175]')}>{c.label}</p>
                <p className={cn('text-2xl font-bold', c.highlight ? 'text-[#008060]' : 'text-[#202223]')}>{c.value}</p>
                {c.sub && <p className="text-xs text-[#6D7175] mt-1">{c.sub}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Payment breakdown */}
            <div className="bg-white rounded-xl border border-[#E1E3E5] p-5">
              <h3 className="text-sm font-semibold text-[#202223] mb-4">Payment methods</h3>
              <div className="space-y-3">
                {data.paymentBreakdown.map((p) => {
                  const Icon = payIcon[p.method] || Banknote;
                  return (
                    <div key={p.method} className="flex items-center justify-between py-2 border-b border-[#F1F1F1] last:border-0">
                      <div className="flex items-center gap-2.5">
                        <Icon size={15} className={payColor[p.method] || 'text-[#6D7175]'} />
                        <span className="text-sm font-medium text-[#202223]">{p.method}</span>
                        <span className="text-xs text-[#6D7175]">{p.count} transactions</span>
                      </div>
                      <span className="text-sm font-bold text-[#202223]">{fmt(p.total)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cashiers on duty */}
            <div className="bg-white rounded-xl border border-[#E1E3E5] p-5">
              <h3 className="text-sm font-semibold text-[#202223] mb-4">Cashiers on duty</h3>
              <div className="space-y-3">
                {data.cashiersOnDuty.length === 0 ? (
                  <p className="text-sm text-[#6D7175]">No cashier data</p>
                ) : data.cashiersOnDuty.map((c) => (
                  <div key={c.name} className="flex items-center justify-between py-2 border-b border-[#F1F1F1] last:border-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center text-xs font-bold">{c.name.charAt(0)}</div>
                      <div>
                        <p className="text-sm font-medium text-[#202223]">{c.name}</p>
                        <p className="text-xs text-[#6D7175]">{c.sales} sales</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#202223]">{fmt(c.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top items */}
          {data.topItems.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E1E3E5] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E1E3E5]">
                <h3 className="text-sm font-semibold text-[#202223]">Top selling items</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F6F6F7] border-b border-[#E1E3E5]">
                    {['Product', 'Units sold', 'Revenue'].map((h, i) => (
                      <th key={h} className={cn('px-5 py-3 text-xs font-semibold text-[#6D7175] uppercase tracking-wide', i > 0 ? 'text-right' : 'text-left')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E3E5]">
                  {data.topItems.map((item) => (
                    <tr key={item.name} className="hover:bg-[#F6F6F7] transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-[#202223]">{item.name}</td>
                      <td className="px-5 py-3.5 text-sm text-[#6D7175] text-right">{item.qty}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-[#202223] text-right">{fmt(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
