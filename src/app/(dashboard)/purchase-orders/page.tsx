'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Eye, X, Loader2, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface PurchaseOrder {
  id: number; status: string; totalAmount: number; createdAt: string; note: string | null;
  supplier: { id: number; name: string };
  store: { id: number; name: string };
  items: { id: number; productId: number; qty: number; costPrice: number; product?: { name: string } }[];
}

const statusStyle = (s: string) => {
  if (s === 'RECEIVED') return 'bg-[#EAF5F0] text-[#008060]';
  if (s === 'CANCELLED') return 'bg-[#FFF4F4] text-[#D72C0D]';
  return 'bg-[#FFF4E4] text-[#B25000]';
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetch = () => {
    setLoading(true);
    api.get('/purchase-orders').then(({ data }) => setOrders(Array.isArray(data) ? data : data.orders || [])).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, []);

  const filtered = orders.filter((o) => !search || o.supplier.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleReceive = async (id: number) => {
    if (!confirm('Mark as received? This will update stock levels.')) return;
    try { await api.patch(`/purchase-orders/${id}/receive`); toast.success('Marked as received'); setSelected(null); fetch(); }
    catch { toast.error('Failed to update'); }
  };

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div>
        <h1 className="text-xl font-semibold text-[#202223]">Purchase Orders</h1>
        <p className="text-sm text-[#6D7175] mt-0.5">Track supplier orders and stock receiving</p>
      </div>

      <div className="bg-white rounded-xl border border-[#E1E3E5] overflow-hidden">
        <div className="p-4 border-b border-[#E1E3E5]">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9196]" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by supplier..."
              className="w-full pl-9 pr-3 py-2 border border-[#C9CCCF] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] bg-[#F6F6F7]" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F6F6F7] border-b border-[#E1E3E5]">
                {['Order ID', 'Supplier', 'Store', 'Date', 'Amount', 'Status', ''].map((h, i) => (
                  <th key={i} className={cn('px-5 py-3 text-xs font-semibold text-[#6D7175] uppercase tracking-wide', i === 4 ? 'text-right' : 'text-left')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E3E5]">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-5 py-3.5"><div className="h-4 bg-[#F6F6F7] rounded animate-pulse" /></td>)}</tr>
              )) : paginated.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16"><ClipboardList size={32} className="text-[#C4CDD5] mx-auto mb-3" /><p className="text-sm font-medium text-[#6D7175]">No purchase orders found</p></td></tr>
              ) : paginated.map((o) => (
                <tr key={o.id} className="hover:bg-[#F6F6F7] transition-colors">
                  <td className="px-5 py-3.5 text-sm font-semibold text-[#202223]">PO-{o.id}</td>
                  <td className="px-5 py-3.5 text-sm text-[#202223] font-medium">{o.supplier.name}</td>
                  <td className="px-5 py-3.5 text-sm text-[#6D7175]">{o.store?.name || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-[#6D7175]">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5 text-sm font-bold text-[#202223] text-right">${Number(o.totalAmount).toFixed(2)}</td>
                  <td className="px-5 py-3.5"><span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', statusStyle(o.status))}>{o.status}</span></td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => setSelected(o)} className="p-1.5 rounded-lg hover:bg-[#EEF3FB] text-[#8C9196] hover:text-[#2C6ECB] transition-colors"><Eye size={14} /></button>
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

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5] sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-[#202223]">PO-{selected.id}</h3>
                <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', statusStyle(selected.status))}>{selected.status}</span>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-[#8C9196] hover:bg-[#F6F6F7] transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[['Supplier', selected.supplier.name], ['Store', selected.store?.name || '—'], ['Date', new Date(selected.createdAt).toLocaleDateString()], ['Note', selected.note || '—']].map(([l, v]) => (
                  <div key={l} className="bg-[#F6F6F7] rounded-lg p-3">
                    <p className="text-xs text-[#6D7175] font-medium mb-0.5">{l}</p>
                    <p className="text-sm font-semibold text-[#202223]">{v}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6D7175] uppercase tracking-wide mb-3">Items</p>
                <div className="space-y-2 rounded-lg border border-[#E1E3E5] overflow-hidden">
                  {selected.items.map((item, i) => (
                    <div key={item.id} className={cn('flex justify-between items-center px-4 py-3 text-sm', i % 2 === 0 ? 'bg-white' : 'bg-[#F6F6F7]')}>
                      <span className="text-[#202223] font-medium">Product #{item.productId}</span>
                      <span className="text-[#6D7175]">qty: {Number(item.qty)} × ${Number(item.costPrice).toFixed(2)}</span>
                      <span className="font-bold text-[#202223]">${(Number(item.qty) * Number(item.costPrice)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#E1E3E5]">
                <span className="text-sm font-semibold text-[#202223]">Total</span>
                <span className="text-xl font-bold text-[#202223]">${Number(selected.totalAmount).toFixed(2)}</span>
              </div>
              {selected.status === 'PENDING' && (
                <button onClick={() => handleReceive(selected.id)} className="w-full bg-[#008060] hover:bg-[#006E52] text-white py-3 rounded-lg text-sm font-semibold transition-colors">
                  Mark as Received
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
