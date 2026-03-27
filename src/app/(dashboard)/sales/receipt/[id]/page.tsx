'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Loader2, Store } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Sale {
  id: number;
  receiptNo: string;
  total: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  status: string;
  createdAt: string;
  cashier: { name: string };
  customer: { name: string } | null;
  store?: { name: string; address?: string; phone?: string };
  company?: { name: string; settings?: { logoUrl?: string; offlineAllowedDays: number } };
  payments: { method: string; amount: number }[];
  items: { id: number; product: { name: string; sku?: string }; qty: number; unitPrice: number; lineTotal: number }[];
}

export default function ReceiptPage() {
  const { id } = useParams();
  const router = useRouter();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/sales`)
      .then(res => {
         const salesList: Sale[] = res.data.sales || res.data;
         const found = salesList.find(s => s.id === Number(id));
         if (found) {
            setSale(found);
         } else {
            toast.error("Receipt not found");
         }
      })
      .catch(() => toast.error('Error fetching receipt details'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
     return <div className="h-[60vh] flex items-center justify-center text-slate-400"><Loader2 className="animate-spin w-8 h-8" /></div>;
  }

  if (!sale) {
     return <div className="h-[60vh] flex flex-col items-center justify-center text-slate-500"><p>Sale not found</p><button onClick={() => router.back()} className="mt-4 text-indigo-500 hover:underline">Go Back</button></div>;
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      
      {/* Non-printable Action Bar */}
      <div className="print:hidden flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition">
           <ArrowLeft size={18} /> Back to Sales
        </button>
        <button onClick={handlePrint} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-sm shadow-indigo-600/20">
           <Printer size={18} /> Print Receipt
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; }
          /* Hide sidebar/header from layout */
          aside, header { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; overflow: visible !important; }
          /* Reset paper size to standard thermal receipt width */
          @page { margin: 0; size: 80mm 200mm; }
        }
      `}} />

      {/* The Actual Receipt bounds */}
      <div className="flex justify-center flex-col items-center">
         {/* Instruction note just for web interface */}
         <p className="print:hidden text-xs text-slate-400 mb-4 font-mono">Thermal receipt preview (80mm standard width)</p>
         
         {/* Receipt Container - Looks like a physical thermal receipt */}
         <div id="thermal-receipt" className="bg-white border sm:shadow-lg w-full max-w-[380px] print:w-[80mm] print:border-none print:shadow-none p-6 font-mono text-sm text-slate-900 mx-auto relative overflow-hidden ring-1 ring-slate-100 sm:rounded-md">
            
            {/* Store Header */}
            <div className="flex flex-col items-center justify-center text-center space-y-1 pb-4 border-b-2 border-dashed border-slate-300">
               {sale.company?.settings?.logoUrl ? (
                  <img src={sale.company.settings.logoUrl} alt="Store Logo" className="h-12 w-auto object-contain mb-2 grayscale" />
               ) : (
                  <Store size={32} className="text-slate-700 mb-2" />
               )}
               <h1 className="text-xl font-extrabold tracking-tight uppercase">{sale.store?.name || sale.company?.name || 'Retail Store'}</h1>
               {sale.store?.address && <p className="text-xs uppercase break-words w-full px-4">{sale.store.address}</p>}
               {sale.store?.phone && <p className="text-xs uppercase">TEL: {sale.store.phone}</p>}
            </div>

            {/* Receipt Meta */}
            <div className="py-4 space-y-1 text-xs border-b-2 border-dashed border-slate-300">
               <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
               </div>
               <div className="flex justify-between">
                  <span>RECEIPT NO:</span>
                  <span className="font-bold">{sale.receiptNo}</span>
               </div>
               <div className="flex justify-between">
                  <span>CASHIER:</span>
                  <span>{sale.cashier.name.toUpperCase()}</span>
               </div>
               {sale.customer?.name && (
                  <div className="flex justify-between">
                    <span>CUSTOMER:</span>
                    <span>{sale.customer.name.toUpperCase()}</span>
                  </div>
               )}
               <div className="flex justify-between">
                  <span>STATUS:</span>
                  <span>{sale.status.toUpperCase()}</span>
               </div>
            </div>

            {/* Items */}
            <div className="py-4 border-b-2 border-dashed border-slate-300">
               <table className="w-full text-xs">
                  <thead>
                     <tr className="border-b border-slate-200">
                        <th className="text-left font-bold pb-1 w-[55%]">ITEM</th>
                        <th className="text-center font-bold pb-1 w-[15%]">QTY</th>
                        <th className="text-right font-bold pb-1 w-[30%]">TOTAL</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {sale.items.map(item => (
                        <tr key={item.id}>
                           <td className="py-2 align-top">
                             <div className="font-semibold uppercase tracking-tight pr-1 leading-tight">{item.product.name}</div>
                             {item.product.sku && <div className="text-[10px] text-slate-500">{item.product.sku}</div>}
                             <div className="text-[10px] mt-0.5 text-slate-500">@ ${Number(item.unitPrice).toFixed(2)}</div>
                           </td>
                           <td className="py-2 align-top text-center pt-2.5 font-medium">{Number(item.qty)}</td>
                           <td className="py-2 align-top text-right pt-2.5 font-bold">${Number(item.lineTotal).toFixed(2)}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            {/* Totals */}
            <div className="py-4 space-y-1 text-xs border-b-2 border-dashed border-slate-300">
               <div className="flex justify-between items-center text-slate-600">
                  <span>SUBTOTAL:</span>
                  <span>${Number(sale.subtotal).toFixed(2)}</span>
               </div>
               {Number(sale.discountAmount) > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>DISCOUNT:</span>
                    <span>-${Number(sale.discountAmount).toFixed(2)}</span>
                  </div>
               )}
               {Number(sale.taxAmount) > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>TAX (INCL):</span>
                    <span>${Number(sale.taxAmount).toFixed(2)}</span>
                  </div>
               )}
               <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-200">
                  <span className="text-base font-extrabold tracking-widest">TOTAL</span>
                  <span className="text-lg font-extrabold">${Number(sale.total).toFixed(2)}</span>
               </div>
            </div>

            {/* Payment Info */}
            <div className="py-4 space-y-1 text-xs border-b-2 border-dashed border-slate-300">
               {sale.payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span>PAID BY {p.method.toUpperCase()}:</span>
                    <span className="font-bold">${Number(p.amount).toFixed(2)}</span>
                  </div>
               ))}
               {(() => {
                  const paidTotal = sale.payments.reduce((s, p) => s + Number(p.amount), 0);
                  const change = paidTotal > Number(sale.total) ? paidTotal - Number(sale.total) : 0;
                  if (change > 0) {
                     return (
                        <div className="flex justify-between items-center pt-1 mt-1 font-bold">
                           <span>CHANGE DUE:</span>
                           <span>${change.toFixed(2)}</span>
                        </div>
                     );
                  }
               })()}
            </div>

            {/* Footer */}
            <div className="pt-6 pb-2 text-center text-xs space-y-2 uppercase font-medium">
               {sale.status === 'REFUNDED' && (
                  <div className="border border-slate-400 py-1 mb-4 font-bold tracking-widest text-slate-700 bg-slate-100">
                     *** REFUND RECEIPT ***
                  </div>
               )}
               {sale.status === 'VOID' && (
                  <div className="border border-slate-400 py-1 mb-4 font-bold tracking-widest text-slate-700 bg-slate-100">
                     *** VOID RECEIPT ***
                  </div>
               )}
               <p>*** THANK YOU FOR YOUR BUSINESS ***</p>
               {sale.company?.settings?.offlineAllowedDays ? <p className="text-[10px] mt-2 text-slate-400">POWERED BY NEXTGEN POS</p> : null}
            </div>

            {/* ZigZag Bottom edge (web only visual) */}
            <div className="print:hidden absolute -bottom-2 inset-x-0 h-4 bg-transparent border-t-8 border-t-white border-dashed drop-shadow-sm opacity-50" />
         </div>
      </div>
    </div>
  );
}
