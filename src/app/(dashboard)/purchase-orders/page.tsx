'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Eye, X, Loader2, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface PurchaseOrder {
  id: number;
  orderNo: string;
  status: string;
  totalAmount: number;
  expectedDate: string | null;
  receivedDate: string | null;
  createdAt: string;
  supplier: { id: number; name: string };
  items: { id: number; productName: string; quantity: number; unitCost: number; receivedQuantity: number }[];
}

interface Supplier {
  id: number;
  name: string;
}

interface POForm {
  supplierId: string;
  expectedDate: string;
  items: { productId: string; productName: string; quantity: string; unitCost: string }[];
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/purchase-orders').catch(() => ({ data: [] })),
      api.get('/suppliers').catch(() => ({ data: [] })),
    ])
      .then(([poRes, supRes]) => {
        setOrders(poRes.data);
        setSuppliers(supRes.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.orderNo.toLowerCase().includes(q) || o.supplier.name.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const statusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'badge bg-gray-100 text-gray-600';
      case 'ORDERED': return 'badge badge-info';
      case 'PARTIAL': return 'badge badge-warning';
      case 'RECEIVED': return 'badge badge-success';
      case 'CANCELLED': return 'badge badge-danger';
      default: return 'badge';
    }
  };

  const handleReceive = async (orderId: number) => {
    if (!confirm('Mark this order as fully received?')) return;
    try {
      await api.patch(`/purchase-orders/${orderId}/receive`);
      toast.success('Order marked as received');
      setSelectedOrder(null);
      fetchData();
    } catch {
      toast.error('Failed to update order');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-500 text-sm mt-1">Manage supplier orders and receiving</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by order # or supplier..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-gray-100 bg-gray-50/50">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Order #</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Supplier</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Date</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Amount</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No purchase orders found</td></tr>
              ) : (
                paginated.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{o.orderNo}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{o.supplier.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right">${Number(o.totalAmount).toFixed(2)}</td>
                    <td className="px-5 py-3 text-center"><span className={statusBadge(o.status)}>{o.status}</span></td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => setSelectedOrder(o)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-500">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ClipboardList size={18} className="text-gray-500" />
                <h3 className="font-semibold text-gray-900">{selectedOrder.orderNo}</h3>
                <span className={statusBadge(selectedOrder.status)}>{selectedOrder.status}</span>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Supplier</p>
                  <p className="font-medium">{selectedOrder.supplier.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Created</p>
                  <p className="font-medium">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                </div>
                {selectedOrder.expectedDate && (
                  <div>
                    <p className="text-gray-500">Expected</p>
                    <p className="font-medium">{new Date(selectedOrder.expectedDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.productName} <span className="text-gray-400">× {item.quantity}</span>
                        {item.receivedQuantity > 0 && (
                          <span className="text-green-600 ml-1">({item.receivedQuantity} received)</span>
                        )}
                      </span>
                      <span className="font-medium">${(Number(item.unitCost) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${Number(selectedOrder.totalAmount).toFixed(2)}</span>
              </div>

              {selectedOrder.status === 'ORDERED' && (
                <button
                  onClick={() => handleReceive(selectedOrder.id)}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold transition"
                >
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
