'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Search, Eye, Download, ChevronLeft, ChevronRight,
  Calendar, Filter, X, Receipt, RotateCcw, Ban, Printer,
  ShoppingBag,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

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
  store?: { name: string };
  payments: { method: string; amount: number }[];
  items: { id: number; product: { name: string }; qty: number; unitPrice: number; lineTotal: number }[];
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<'refund' | 'void' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const perPage = 20;

  const fetchSales = () => {
    setLoading(true);
    api.get('/sales')
      .then(({ data }) => setSales(data.sales || data))
      .catch(() => toast.error('Failed to load sales'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const filtered = sales.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.receiptNo.toLowerCase().includes(q) ||
      s.customer?.name.toLowerCase().includes(q) ||
      s.cashier.name.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const paymentBadgeClasses = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20';
      case 'CARD':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-2 ring-blue-500/20';
      case 'MOBILE':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-2 ring-amber-500/20';
      default:
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 ring-2 ring-gray-400/20';
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'badge badge-success';
      case 'REFUNDED': return 'badge badge-danger';
      case 'VOIDED': return 'badge badge-danger';
      default: return 'badge badge-warning';
    }
  };

  const isCreatedToday = (dateStr: string) => {
    const saleDate = new Date(dateStr);
    const today = new Date();
    return (
      saleDate.getFullYear() === today.getFullYear() &&
      saleDate.getMonth() === today.getMonth() &&
      saleDate.getDate() === today.getDate()
    );
  };

  const handleRefund = async () => {
    if (!selectedSale) return;
    setActionLoading(true);
    try {
      await api.post(`/sales/${selectedSale.id}/refund`);
      toast.success('Sale refunded successfully');
      setSelectedSale(null);
      setConfirmAction(null);
      fetchSales();
    } catch {
      toast.error('Failed to refund sale');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!selectedSale) return;
    setActionLoading(true);
    try {
      await api.post(`/sales/${selectedSale.id}/void`);
      toast.success('Sale voided successfully');
      setSelectedSale(null);
      setConfirmAction(null);
      fetchSales();
    } catch {
      toast.error('Failed to void sale');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintReceipt = (saleId: number) => {
    window.open(`/sales/receipt/${saleId}`, '_blank');
  };

  /* Skeleton row for loading state */
  const SkeletonRow = () => (
    <tr>
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-5 py-3.5">
          <div className="animate-pulse bg-gray-200/70 rounded-lg h-4 w-full" />
        </td>
      ))}
    </tr>
  );

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-500 text-sm mt-1">View and manage all sales transactions</p>
        </div>
      </div>

      {/* Main card */}
      <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {/* Gradient accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

        {/* Search */}
        <div className="p-4 pt-5">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by receipt, customer, or cashier..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-300 transition-all bg-gray-50/50 placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="border-b border-gray-50" />

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-gray-50 bg-gray-50/60">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Receipt</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Customer</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Cashier</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Payment</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Amount</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                        <ShoppingBag size={24} className="text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">No sales found</p>
                      <p className="text-xs text-gray-400 mt-1">Try adjusting your search terms</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-gray-900 tracking-tight">{sale.receiptNo}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">
                      {new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{sale.customer?.name || 'Walk-in'}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{sale.cashier.name}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={paymentBadgeClasses(sale.payments[0]?.method || 'CASH')}>{sale.payments[0]?.method || '\u2014'}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-bold text-gray-900">${Number(sale.total).toFixed(2)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={statusBadge(sale.status)}>{sale.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * perPage + 1}&ndash;{Math.min(page * perPage, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg border border-gray-100 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="p-1.5 rounded-lg border border-gray-100 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && !confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto border border-gray-100">
            {/* Modal gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 rounded-t-2xl" />

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Receipt size={16} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-base text-gray-900">{selectedSale.receiptNo}</h3>
                <span className={statusBadge(selectedSale.status)}>{selectedSale.status}</span>
              </div>
              <button onClick={() => setSelectedSale(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50/60 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Date</p>
                  <p className="font-semibold text-gray-900">{new Date(selectedSale.createdAt).toLocaleString()}</p>
                </div>
                <div className="bg-gray-50/60 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Customer</p>
                  <p className="font-semibold text-gray-900">{selectedSale.customer?.name || 'Walk-in'}</p>
                </div>
                <div className="bg-gray-50/60 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Cashier</p>
                  <p className="font-semibold text-gray-900">{selectedSale.cashier.name}</p>
                </div>
                <div className="bg-gray-50/60 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-medium mb-0.5">Payment</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {selectedSale.payments.map((p, idx) => (
                      <span key={idx} className={paymentBadgeClasses(p.method)}>{p.method}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-b border-gray-50" />

              {/* Items section */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Items</p>
                <div className="space-y-2">
                  {selectedSale.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm py-1">
                      <span className="text-gray-700">
                        {item.product.name} <span className="text-gray-400 font-medium">x {Number(item.qty)}</span>
                      </span>
                      <span className="font-semibold text-gray-900">${Number(item.lineTotal).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-b border-gray-50" />

              {/* Totals */}
              <div className="space-y-1.5">
                {Number(selectedSale.discountAmount) > 0 && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Discount</span>
                    <span className="text-emerald-600 font-medium">-${Number(selectedSale.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                {Number(selectedSale.taxAmount) > 0 && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Tax</span>
                    <span className="font-medium">${Number(selectedSale.taxAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-[28px] font-extrabold text-gray-900">${Number(selectedSale.total).toFixed(2)}</span>
                </div>
              </div>

              <div className="border-b border-gray-50" />

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handlePrintReceipt(selectedSale.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm transition-all"
                >
                  <Printer size={14} />
                  Print Receipt
                </button>

                {selectedSale.status === 'COMPLETED' && (
                  <>
                    <button
                      onClick={() => setConfirmAction('refund')}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-orange-50 text-orange-600 hover:bg-orange-100 ring-1 ring-orange-200/60 hover:shadow-sm transition-all"
                    >
                      <RotateCcw size={14} />
                      Refund
                    </button>

                    {isCreatedToday(selectedSale.createdAt) && (
                      <button
                        onClick={() => setConfirmAction('void')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200/60 hover:shadow-sm transition-all"
                      >
                        <Ban size={14} />
                        Void
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && selectedSale && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 border border-gray-100">
            <div className="p-6 text-center">
              <div className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4',
                confirmAction === 'refund' ? 'bg-orange-100' : 'bg-red-100',
              )}>
                {confirmAction === 'refund' ? (
                  <RotateCcw size={24} className="text-orange-600" />
                ) : (
                  <Ban size={24} className="text-red-600" />
                )}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {confirmAction === 'refund' ? 'Refund Sale' : 'Void Sale'}
              </h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                {confirmAction === 'refund'
                  ? `Are you sure you want to refund sale ${selectedSale.receiptNo}? This will reverse the payment of $${Number(selectedSale.total).toFixed(2)}.`
                  : `Are you sure you want to void sale ${selectedSale.receiptNo}? This action cannot be undone.`
                }
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-100 text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction === 'refund' ? handleRefund : handleVoid}
                  disabled={actionLoading}
                  className={cn(
                    'flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:shadow-md',
                    confirmAction === 'refund' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-500 hover:bg-red-600',
                  )}
                >
                  {actionLoading ? 'Processing...' : confirmAction === 'refund' ? 'Confirm Refund' : 'Confirm Void'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
