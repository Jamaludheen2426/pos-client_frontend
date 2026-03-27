'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeftRight, Plus, Minus, History, Loader2,
  ChevronLeft, ChevronRight, Filter, Package, ArrowRight,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Product { id: number; name: string; sku: string; }
interface StoreItem { id: number; name: string; }
interface Movement {
  id: number;
  productId: number;
  product?: { name: string; sku: string };
  storeId: number;
  store?: { name: string };
  type: string;
  qty: number;
  reason: string | null;
  note: string | null;
  createdAt: string;
  fromStoreId?: number | null;
  toStoreId?: number | null;
  fromStore?: { name: string } | null;
  toStore?: { name: string } | null;
}

type Tab = 'adjustments' | 'transfers' | 'history';

export default function StockManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('adjustments');
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Adjustment form
  const [adjProductId, setAdjProductId] = useState('');
  const [adjStoreId, setAdjStoreId] = useState('');
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjSubmitting, setAdjSubmitting] = useState(false);
  const [adjMovements, setAdjMovements] = useState<Movement[]>([]);
  const [adjLoading, setAdjLoading] = useState(false);

  // Transfer form
  const [trfProductId, setTrfProductId] = useState('');
  const [trfFromStoreId, setTrfFromStoreId] = useState('');
  const [trfToStoreId, setTrfToStoreId] = useState('');
  const [trfQty, setTrfQty] = useState('');
  const [trfNote, setTrfNote] = useState('');
  const [trfSubmitting, setTrfSubmitting] = useState(false);
  const [trfMovements, setTrfMovements] = useState<Movement[]>([]);
  const [trfLoading, setTrfLoading] = useState(false);

  // History
  const [histMovements, setHistMovements] = useState<Movement[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histPage, setHistPage] = useState(1);
  const [histTotal, setHistTotal] = useState(0);
  const [histFilterProduct, setHistFilterProduct] = useState('');
  const [histFilterStore, setHistFilterStore] = useState('');
  const [histFilterType, setHistFilterType] = useState('');
  const perPage = 20;

  useEffect(() => {
    Promise.all([
      api.get('/products?limit=1000').catch(() => ({ data: { products: [] } })),
      api.get('/stores').catch(() => ({ data: [] })),
    ]).then(([prodRes, storeRes]) => {
      const prods = prodRes.data.products || prodRes.data;
      setProducts(Array.isArray(prods) ? prods : []);
      setStores(Array.isArray(storeRes.data) ? storeRes.data : []);
    }).finally(() => setLoading(false));
  }, []);

  const fetchAdjMovements = useCallback(() => {
    setAdjLoading(true);
    api.get('/stock-management/movements?type=ADJUSTMENT&limit=20')
      .then((res) => setAdjMovements(res.data.movements || res.data || []))
      .catch(() => {})
      .finally(() => setAdjLoading(false));
  }, []);

  const fetchTrfMovements = useCallback(() => {
    setTrfLoading(true);
    api.get('/stock-management/movements?type=TRANSFER&limit=20')
      .then((res) => setTrfMovements(res.data.movements || res.data || []))
      .catch(() => {})
      .finally(() => setTrfLoading(false));
  }, []);

  const fetchHistory = useCallback(() => {
    setHistLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(histPage));
    params.set('limit', String(perPage));
    if (histFilterProduct) params.set('productId', histFilterProduct);
    if (histFilterStore) params.set('storeId', histFilterStore);
    if (histFilterType) params.set('type', histFilterType);
    api.get(`/stock-management/movements?${params.toString()}`)
      .then((res) => {
        const data = res.data;
        setHistMovements(data.movements || data || []);
        setHistTotal(data.total || (data.movements || data || []).length);
      })
      .catch(() => toast.error('Failed to load movements'))
      .finally(() => setHistLoading(false));
  }, [histPage, histFilterProduct, histFilterStore, histFilterType]);

  useEffect(() => {
    if (activeTab === 'adjustments') fetchAdjMovements();
    if (activeTab === 'transfers') fetchTrfMovements();
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchAdjMovements, fetchTrfMovements, fetchHistory]);

  const handleAdjust = async () => {
    if (!adjProductId || !adjStoreId || !adjQty) {
      toast.error('Product, store, and quantity are required');
      return;
    }
    setAdjSubmitting(true);
    try {
      await api.post('/stock-management/adjust', {
        productId: Number(adjProductId),
        storeId: Number(adjStoreId),
        qty: Number(adjQty),
        reason: adjReason || null,
      });
      toast.success('Stock adjusted successfully');
      setAdjProductId(''); setAdjStoreId(''); setAdjQty(''); setAdjReason('');
      fetchAdjMovements();
    } catch {
      toast.error('Failed to adjust stock');
    } finally {
      setAdjSubmitting(false);
    }
  };

  const handleTransfer = async () => {
    if (!trfProductId || !trfFromStoreId || !trfToStoreId || !trfQty) {
      toast.error('All fields except note are required');
      return;
    }
    if (trfFromStoreId === trfToStoreId) {
      toast.error('Source and destination store must be different');
      return;
    }
    setTrfSubmitting(true);
    try {
      await api.post('/stock-management/transfer', {
        productId: Number(trfProductId),
        fromStoreId: Number(trfFromStoreId),
        toStoreId: Number(trfToStoreId),
        qty: Number(trfQty),
        note: trfNote || null,
      });
      toast.success('Transfer completed');
      setTrfProductId(''); setTrfFromStoreId(''); setTrfToStoreId(''); setTrfQty(''); setTrfNote('');
      fetchTrfMovements();
    } catch {
      toast.error('Failed to transfer stock');
    } finally {
      setTrfSubmitting(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'adjustments', label: 'Stock Adjustments', icon: Plus },
    { key: 'transfers', label: 'Stock Transfers', icon: ArrowLeftRight },
    { key: 'history', label: 'Movement History', icon: History },
  ];

  const inputClass = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const selectClass = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

  const histTotalPages = Math.ceil(histTotal / perPage);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      ADJUSTMENT: 'bg-blue-50 text-blue-600',
      TRANSFER: 'bg-purple-50 text-purple-600',
      SALE: 'bg-green-50 text-green-600',
      PURCHASE: 'bg-yellow-50 text-yellow-700',
      RETURN: 'bg-orange-50 text-orange-600',
    };
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', colors[type] || 'bg-gray-50 text-gray-600')}>
        {type}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
        <p className="text-gray-500 text-sm mt-1">Adjust inventory, transfer between stores, and view movement history</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition',
              activeTab === tab.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stock Adjustments */}
      {activeTab === 'adjustments' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-5">Adjust Stock</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                <select value={adjProductId} onChange={(e) => setAdjProductId(e.target.value)} className={selectClass}>
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store *</label>
                <select value={adjStoreId} onChange={(e) => setAdjStoreId(e.target.value)} className={selectClass}>
                  <option value="">Select store...</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity * (use negative to reduce)</label>
                <input type="number" value={adjQty} onChange={(e) => setAdjQty(e.target.value)}
                  placeholder="e.g. 10 or -5" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input value={adjReason} onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Damaged goods, Recount" className={inputClass} />
              </div>
            </div>
            <button onClick={handleAdjust} disabled={adjSubmitting}
              className="mt-5 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition disabled:opacity-50">
              {adjSubmitting && <Loader2 size={14} className="animate-spin" />}
              Submit Adjustment
            </button>
          </div>

          {/* Recent adjustments */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Recent Adjustments</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Product</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Store</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Qty</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Reason</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {adjLoading ? (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading...</td></tr>
                  ) : adjMovements.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">No adjustments yet</td></tr>
                  ) : (
                    adjMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-sm text-gray-900">{m.product?.name || `Product #${m.productId}`}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{m.store?.name || `Store #${m.storeId}`}</td>
                        <td className={cn('px-5 py-3 text-sm font-medium text-right', m.qty > 0 ? 'text-green-600' : 'text-red-500')}>
                          {m.qty > 0 ? `+${m.qty}` : m.qty}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">{m.reason || '-'}</td>
                        <td className="px-5 py-3 text-sm text-gray-400">{formatDate(m.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stock Transfers */}
      {activeTab === 'transfers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-5">Transfer Stock</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                <select value={trfProductId} onChange={(e) => setTrfProductId(e.target.value)} className={selectClass}>
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Store *</label>
                <select value={trfFromStoreId} onChange={(e) => setTrfFromStoreId(e.target.value)} className={selectClass}>
                  <option value="">Select source store...</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Store *</label>
                <select value={trfToStoreId} onChange={(e) => setTrfToStoreId(e.target.value)} className={selectClass}>
                  <option value="">Select destination store...</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input type="number" min="1" value={trfQty} onChange={(e) => setTrfQty(e.target.value)}
                  placeholder="e.g. 10" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <input value={trfNote} onChange={(e) => setTrfNote(e.target.value)}
                  placeholder="Optional note" className={inputClass} />
              </div>
            </div>
            <button onClick={handleTransfer} disabled={trfSubmitting}
              className="mt-5 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition disabled:opacity-50">
              {trfSubmitting && <Loader2 size={14} className="animate-spin" />}
              <ArrowRight size={14} />
              Transfer Stock
            </button>
          </div>

          {/* Recent transfers */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Recent Transfers</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Product</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">From</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">To</th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Qty</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Note</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trfLoading ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
                  ) : trfMovements.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">No transfers yet</td></tr>
                  ) : (
                    trfMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-sm text-gray-900">{m.product?.name || `Product #${m.productId}`}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{m.fromStore?.name || `Store #${m.fromStoreId}`}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{m.toStore?.name || `Store #${m.toStoreId}`}</td>
                        <td className="px-5 py-3 text-sm font-medium text-right text-gray-900">{m.qty}</td>
                        <td className="px-5 py-3 text-sm text-gray-500">{m.note || '-'}</td>
                        <td className="px-5 py-3 text-sm text-gray-400">{formatDate(m.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Movement History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 flex flex-wrap items-center gap-3 border-b border-gray-100">
            <Filter size={16} className="text-gray-400" />
            <select value={histFilterProduct} onChange={(e) => { setHistFilterProduct(e.target.value); setHistPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select value={histFilterStore} onChange={(e) => { setHistFilterStore(e.target.value); setHistPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select value={histFilterType} onChange={(e) => { setHistFilterType(e.target.value); setHistPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Types</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="TRANSFER">Transfer</option>
              <option value="SALE">Sale</option>
              <option value="PURCHASE">Purchase</option>
              <option value="RETURN">Return</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Product</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Store</th>
                  <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Type</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Qty</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Reason / Note</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {histLoading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td></tr>
                ) : histMovements.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400">No movements found</td></tr>
                ) : (
                  histMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-gray-400" />
                          <span className="text-sm text-gray-900">{m.product?.name || `Product #${m.productId}`}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{m.store?.name || `Store #${m.storeId}`}</td>
                      <td className="px-5 py-3 text-center">{typeBadge(m.type)}</td>
                      <td className={cn('px-5 py-3 text-sm font-medium text-right', m.qty > 0 ? 'text-green-600' : 'text-red-500')}>
                        {m.qty > 0 ? `+${m.qty}` : m.qty}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{m.reason || m.note || '-'}</td>
                      <td className="px-5 py-3 text-sm text-gray-400">{formatDate(m.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {histTotalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {histPage} of {histTotalPages} ({histTotal} total)
              </p>
              <div className="flex gap-1">
                <button onClick={() => setHistPage(histPage - 1)} disabled={histPage <= 1}
                  className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setHistPage(histPage + 1)} disabled={histPage >= histTotalPages}
                  className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
