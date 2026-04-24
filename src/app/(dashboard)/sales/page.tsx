'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Eye, X, Loader2, ChevronLeft, ChevronRight, RotateCcw, Ban, Printer, ShoppingBag, Receipt } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Sale {
  id: number; receiptNo: string; total: number; subtotal: number;
  discountAmount: number; taxAmount: number; status: string; createdAt: string;
  cashier: { name: string }; customer: { name: string } | null;
  payments: { method: string; amount: number }[];
  items: { id: number; product: { name: string }; qty: number; unitPrice: number; lineTotal: number }[];
}

const statusStyle = (s: string) => {
  if (s === 'COMPLETED') return 'bg-[#EAF5F0] text-[#008060]';
  if (s === 'REFUNDED') return 'bg-[#FFF4E4] text-[#B25000]';
  return 'bg-[#FFF4F4] text-[#D72C0D]';
};
const payStyle = (m: string) => {
  if (m === 'CASH') return 'bg-[#EAF5F0] text-[#008060]';
  if (m === 'CARD') return 'bg-[#EEF3FB] text-[#2C6ECB]';
  return 'bg-[#FFF4E4] text-[#B25000]';
};

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Sale | null>(null);
  const [confirm, setConfirm] = useState<'refund' | 'void' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const load = () => { setLoading(true); api.get('/sales').then(({ data }) => setSales(data.sales || data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const filtered = sales.filter((s) => !search || s.receiptNo.toLowerCase().includes(search.toLowerCase()) || s.customer?.name.toLowerCase().includes(search.toLowerCase()) || s.cashier.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const isToday = (d: string) => { const t = new Date(d), n = new Date(); return t.getFullYear() === n.getFullYear() && t.getMonth() === n.getMonth() && t.getDate() === n.getDate(); };

  const handleRefund = async () => {
    if (!selected) return; setActionLoading(true);
    try { await api.post(`/sales/${selected.id}/refund`); toast.success('Sale refunded'); setSelected(null); setConfirm(null); load(); }
    catch { toast.error('Failed to refund'); } finally { setActionLoading(false); }
  };
  const handleVoid = async () => {
    if (!selected) return; setActionLoading(true);
    try { await api.post(`/sales/${selected.id}/void`); toast.success('Sale voided'); setSelected(null); setConfirm(null); load(); }
    catch { toast.error('Failed to void'); } finally { setActionLoading(false); }
  };

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div>
        <h1 className="text-xl font-semibold text-[#202223]">Sales</h1>
        <p className="text-sm text-[#6D7175] mt-0.5">View and manage all transactions</p>
      </div>

      <div className="bg-white rounded-xl border border-[#E1E3E5] overflow-hidden">
        <div className="p-4 border-b border-[#E1E3E5]">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9196]" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search receipt, customer, cashier..."
              className="w-full pl-9 pr-3 py-2 border border-[#C9CCCF] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] bg-[#F6F6F7]" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F6F6F7] border-b border-[#E1E3E5]">
                {['Receipt', 'Date & time', 'Customer', 'Cashier', 'Payment', 'Amount', 'Status', ''].map((h, i) => (
                  <th key={i} className={cn('px-5 py-3 text-xs font-semibold text-[#6D7175] uppercase tracking-wide', i === 5 ? 'text-right' : 'text-left')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E3E5]">
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j} className="px-5 py-3.5"><div className="h-4 bg-[#F6F6F7] rounded animate-pulse" /></td>)}</tr>
              )) : paginated.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16"><ShoppingBag size={32} className="text-[#C4CDD5] mx-auto mb-3" /><p className="text-sm font-medium text-[#6D7175]">No sales found</p></td></tr>
              ) : paginated.map((s) => (
                <tr key={s.id} className="hover:bg-[#F6F6F7] transition-colors">
                  <td className="px-5 py-3.5 text-sm font-bold text-[#202223] font-mono">{s.receiptNo}</td>
                  <td className="px-5 py-3.5 text-sm text-[#6D7175]">{new Date(s.createdAt).toLocaleDateString()} {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-5 py-3.5 text-sm text-[#202223]">{s.customer?.name || <span className="text-[#8C9196]">Walk-in</span>}</td>
                  <td className="px-5 py-3.5 text-sm text-[#6D7175]">{s.cashier.name}</td>
                  <td className="px-5 py-3.5"><span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold', payStyle(s.payments[0]?.method || ''))}>{s.payments[0]?.method || '—'}</span></td>
                  <td className="px-5 py-3.5 text-sm font-bold text-[#202223] text-right">${Number(s.total).toFixed(2)}</td>
                  <td className="px-5 py-3.5"><span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', statusStyle(s.status))}>{s.status}</span></td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => setSelected(s)} className="p-1.5 rounded-lg hover:bg-[#EEF3FB] text-[#8C9196] hover:text-[#2C6ECB] transition-colors"><Eye size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-[#E1E3E5] flex items-center justify-between">
            <p className="text-sm text-[#6D7175]">Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg border border-[#E1E3E5] disabled:opacity-40 hover:bg-[#F6F6F7] transition-colors"><ChevronLeft size={15} /></button>
              <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="p-1.5 rounded-lg border border-[#E1E3E5] disabled:opacity-40 hover:bg-[#F6F6F7] transition-colors"><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && !confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5] sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <Receipt size={16} className="text-[#6D7175]" />
                <h3 className="font-bold text-[#202223]">{selected.receiptNo}</h3>
                <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', statusStyle(selected.status))}>{selected.status}</span>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-[#8C9196] hover:bg-[#F6F6F7] transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[['Date', new Date(selected.createdAt).toLocaleString()], ['Customer', selected.customer?.name || 'Walk-in'], ['Cashier', selected.cashier.name], ['Payment', selected.payments.map((p) => p.method).join(', ')]].map(([l, v]) => (
                  <div key={l} className="bg-[#F6F6F7] rounded-lg p-3">
                    <p className="text-xs text-[#6D7175] font-medium mb-0.5">{l}</p>
                    <p className="text-sm font-semibold text-[#202223]">{v}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6D7175] uppercase tracking-wide mb-3">Items</p>
                <div className="space-y-2">
                  {selected.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm py-1">
                      <span className="text-[#202223]">{item.product.name} <span className="text-[#6D7175]">× {Number(item.qty)}</span></span>
                      <span className="font-semibold text-[#202223]">${Number(item.lineTotal).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-[#E1E3E5] pt-4 space-y-1.5">
                {Number(selected.discountAmount) > 0 && <div className="flex justify-between text-sm text-[#6D7175]"><span>Discount</span><span className="text-[#008060] font-medium">-${Number(selected.discountAmount).toFixed(2)}</span></div>}
                {Number(selected.taxAmount) > 0 && <div className="flex justify-between text-sm text-[#6D7175]"><span>Tax</span><span className="font-medium">${Number(selected.taxAmount).toFixed(2)}</span></div>}
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-sm font-semibold text-[#202223]">Total</span>
                  <span className="text-2xl font-bold text-[#202223]">${Number(selected.total).toFixed(2)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => window.open(`/sales/receipt/${selected.id}`, '_blank')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#C9CCCF] bg-white hover:bg-[#F6F6F7] text-[#202223] transition-colors">
                  <Printer size={14} /> Print
                </button>
                {selected.status === 'COMPLETED' && (
                  <>
                    <button onClick={() => setConfirm('refund')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#FFF4E4] text-[#B25000] hover:bg-[#FFE8C0] transition-colors"><RotateCcw size={14} /> Refund</button>
                    {isToday(selected.createdAt) && <button onClick={() => setConfirm('void')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#FFF4F4] text-[#D72C0D] hover:bg-[#FFE0E0] transition-colors"><Ban size={14} /> Void</button>}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {confirm && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-2xl w-full max-w-sm mx-4">
            <div className="p-6 text-center">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4', confirm === 'refund' ? 'bg-[#FFF4E4]' : 'bg-[#FFF4F4]')}>
                {confirm === 'refund' ? <RotateCcw size={22} className="text-[#B25000]" /> : <Ban size={22} className="text-[#D72C0D]" />}
              </div>
              <h3 className="text-base font-bold text-[#202223] mb-2">{confirm === 'refund' ? 'Refund sale' : 'Void sale'}</h3>
              <p className="text-sm text-[#6D7175] mb-6">{confirm === 'refund' ? `Refund ${selected.receiptNo} for $${Number(selected.total).toFixed(2)}?` : `Void ${selected.receiptNo}? This cannot be undone.`}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirm(null)} disabled={actionLoading} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold border border-[#C9CCCF] text-[#202223] hover:bg-[#F6F6F7] transition-colors disabled:opacity-50">Cancel</button>
                <button onClick={confirm === 'refund' ? handleRefund : handleVoid} disabled={actionLoading}
                  className={cn('flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2', confirm === 'refund' ? 'bg-[#B25000] hover:bg-[#8C3E00]' : 'bg-[#D72C0D] hover:bg-[#B52208]')}>
                  {actionLoading && <Loader2 size={14} className="animate-spin" />}{confirm === 'refund' ? 'Confirm refund' : 'Confirm void'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
