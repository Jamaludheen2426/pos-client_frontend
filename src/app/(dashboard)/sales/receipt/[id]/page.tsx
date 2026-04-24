'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Sale {
  id: number; receiptNo: string; total: number; subtotal: number;
  discountAmount: number; taxAmount: number; status: string; createdAt: string;
  cashier: { name: string }; customer: { name: string } | null;
  store?: { name: string; address?: string; phone?: string };
  company?: { name: string };
  payments: { method: string; amount: number }[];
  items: { id: number; product: { name: string; sku?: string }; qty: number; unitPrice: number; lineTotal: number }[];
}

const statusColor: Record<string, string> = {
  COMPLETED: 'bg-[#EAF5F0] text-[#008060]',
  REFUNDED: 'bg-[#FFF4E4] text-[#B25000]',
  VOID: 'bg-[#FFF4F4] text-[#D72C0D]',
};

export default function ReceiptPage() {
  const { id } = useParams();
  const router = useRouter();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/sales/${id}`)
      .then(({ data }) => setSale(data))
      .catch(() => {
        api.get('/sales').then(res => {
          const list: Sale[] = res.data.sales || res.data;
          const found = list.find(s => s.id === Number(id));
          if (found) setSale(found); else toast.error('Receipt not found');
        }).catch(() => toast.error('Failed to load receipt'));
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-[#008060]" />
    </div>
  );

  if (!sale) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-3">
      <p className="text-sm text-[#6D7175]">Receipt not found</p>
      <button onClick={() => router.back()} className="text-sm font-semibold text-[#008060] hover:underline">Go back</button>
    </div>
  );

  const paidTotal = sale.payments.reduce((s, p) => s + Number(p.amount), 0);
  const change = paidTotal > Number(sale.total) ? paidTotal - Number(sale.total) : 0;

  return (
    <div className="p-6 max-w-2xl mx-auto" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `@media print { aside,header,.print-hidden{display:none!important} main{padding:0!important} @page{margin:0;size:80mm auto} }` }} />

      {/* Action bar */}
      <div className="flex items-center justify-between mb-6 print-hidden print:hidden">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-semibold text-[#6D7175] hover:text-[#202223] transition-colors">
          <ArrowLeft size={16} /> Back to sales
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-[#008060] hover:bg-[#006E52] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Printer size={14} /> Print receipt
        </button>
      </div>

      {/* Receipt card */}
      <div className="bg-white rounded-xl border border-[#E1E3E5] overflow-hidden print:rounded-none print:border-none print:shadow-none">
        {/* Store header */}
        <div className="bg-[#1A1A1A] text-white text-center py-8 px-6">
          <p className="font-bold text-lg tracking-wide">{sale.store?.name || sale.company?.name || 'POS System'}</p>
          {sale.store?.address && <p className="text-sm text-white/70 mt-1">{sale.store.address}</p>}
          {sale.store?.phone && <p className="text-sm text-white/70">{sale.store.phone}</p>}
        </div>

        {/* Receipt meta */}
        <div className="px-6 py-5 border-b border-[#E1E3E5] space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-[#6D7175] uppercase tracking-wide">Receipt</span>
            <span className="text-sm font-bold text-[#202223] font-mono">{sale.receiptNo}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-[#6D7175] uppercase tracking-wide">Date</span>
            <span className="text-sm text-[#202223]">{new Date(sale.createdAt).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-[#6D7175] uppercase tracking-wide">Cashier</span>
            <span className="text-sm text-[#202223]">{sale.cashier.name}</span>
          </div>
          {sale.customer && (
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-[#6D7175] uppercase tracking-wide">Customer</span>
              <span className="text-sm text-[#202223]">{sale.customer.name}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-[#6D7175] uppercase tracking-wide">Status</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor[sale.status] || 'bg-[#F6F6F7] text-[#6D7175]'}`}>{sale.status}</span>
          </div>
        </div>

        {/* Items */}
        <div className="px-6 py-5 border-b border-[#E1E3E5]">
          <p className="text-xs font-semibold text-[#6D7175] uppercase tracking-wide mb-4">Items</p>
          <div className="space-y-3">
            {sale.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#202223]">{item.product.name}</p>
                  <p className="text-xs text-[#6D7175] mt-0.5">{Number(item.qty)} × ${Number(item.unitPrice).toFixed(2)}</p>
                </div>
                <p className="text-sm font-bold text-[#202223] flex-shrink-0">${Number(item.lineTotal).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="px-6 py-5 border-b border-[#E1E3E5] space-y-2">
          <div className="flex justify-between text-sm text-[#6D7175]">
            <span>Subtotal</span><span>${Number(sale.subtotal).toFixed(2)}</span>
          </div>
          {Number(sale.discountAmount) > 0 && (
            <div className="flex justify-between text-sm text-[#008060]">
              <span>Discount</span><span>-${Number(sale.discountAmount).toFixed(2)}</span>
            </div>
          )}
          {Number(sale.taxAmount) > 0 && (
            <div className="flex justify-between text-sm text-[#6D7175]">
              <span>Tax</span><span>${Number(sale.taxAmount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-3 border-t border-[#E1E3E5]">
            <span className="text-base font-bold text-[#202223]">Total</span>
            <span className="text-2xl font-bold text-[#202223]">${Number(sale.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="px-6 py-5 border-b border-[#E1E3E5] space-y-2">
          <p className="text-xs font-semibold text-[#6D7175] uppercase tracking-wide mb-3">Payment</p>
          {sale.payments.map((p, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-[#6D7175]">{p.method}</span>
              <span className="font-semibold text-[#202223]">${Number(p.amount).toFixed(2)}</span>
            </div>
          ))}
          {change > 0 && (
            <div className="flex justify-between text-sm font-bold text-[#008060] pt-1 border-t border-[#E1E3E5]">
              <span>Change</span><span>${change.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-6 text-center space-y-1">
          {sale.status === 'REFUNDED' && <p className="text-xs font-bold text-[#B25000] uppercase tracking-widest border border-[#B25000] rounded px-3 py-1 inline-block mb-2">Refund receipt</p>}
          {sale.status === 'VOID' && <p className="text-xs font-bold text-[#D72C0D] uppercase tracking-widest border border-[#D72C0D] rounded px-3 py-1 inline-block mb-2">Void receipt</p>}
          <p className="text-sm font-semibold text-[#202223]">Thank you for your business!</p>
          <p className="text-xs text-[#8C9196]">Powered by POS System</p>
        </div>
      </div>
    </div>
  );
}
