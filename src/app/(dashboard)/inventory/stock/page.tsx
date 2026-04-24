'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeftRight, Plus, History, Loader2,
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

  const inputClass = 'w-full border border-[#C9CCCF] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060]';
  const selectClass = 'w-full border border-[#C9CCCF] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] bg-white';

  const histTotalPages = Math.ceil(histTotal / perPage);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      ADJUSTMENT: 'bg-[#EEF3FB] text-[#2C6ECB]',
      TRANSFER_IN: 'bg-[#F4F0FF] text-[#5C4CCC]',
      TRANSFER_OUT: 'bg-[#F4F0FF] text-[#5C4CCC]',
      SALE: 'bg-[#EAF5F0] text-[#008060]',
      PURCHASE: 'bg-[#FFF4E4] text-[#B25000]',
    };
    const labels: Record<string, string> = {
      TRANSFER_IN: 'Transfer In',
      TRANSFER_OUT: 'Transfer Out',
    };
    return (
      <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', colors[type] || 'bg-[#F6F6F7] text-[#6D7175]')}>
        {labels[type] || type}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[#8C9196]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#202223]">Stock Management</h1>
        <p className="text-[#6D7175] text-sm mt-1">Adjust inventory, transfer between stores, and view movement history</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-[#F6F6F7] rounded-lg p-1 mb-6 w-fit border border-[#E1E3E5]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition',
              activeTab === tab.key
                ? 'bg-white shadow text-[#202223] border border-[#E1E3E5]'
                : 'text-[#6D7175] hover:text-[#202223]',
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stock Adjustments */}
      {activeTab === 'adjustments' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-[#E1E3E5] p-6">
            <h3 className="font-semibold text-[#202223] mb-5">Adjust Stock</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Product *</label>
                <select value={adjProductId} onChange={(e) => setAdjProductId(e.target.value)} className={selectClass}>
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Store *</label>
                <select value={adjStoreId} onChange={(e) => setAdjStoreId(e.target.value)} className={selectClass}>
                  <option value="">Select store...</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Quantity * (use negative to reduce)</label>
                <input type="number" value={adjQty} onChange={(e) => setAdjQty(e.target.value)}
                  placeholder="e.g. 10 or -5" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Reason</label>
                <input value={adjReason} onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Damaged goods, Recount" className={inputClass} />
              </div>
            </div>
            <button onClick={handleAdjust} disabled={adjSubmitting}
              className="mt-5 bg-[#008060] hover:bg-[#006E52] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition disabled:opacity-50">
              {adjSubmitting && <Loader2 size={14} className="animate-spin" />}
              Submit Adjustment
            </button>
          </div>

          {/* Recent adjustments */}
          <div className="bg-white rounded-xl border border-[#E1E3E5]">
            <div className="px-5 py-4 border-b border-[#E1E3E5]">
              <h3 className="font-semibold text-[#202223] text-sm">Recent Adjustments</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F6F6F7] border-b border-[#E1E3E5]">
                    <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Product</th>
                    <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Store</th>
                    <th className="text-right text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Qty</th>
                    <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Reason</th>
                    <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E3E5]">
                  {adjLoading ? (
                    <tr><td colSpan={5} className="text-center py-8 text-[#8C9196]">Loading...</td></tr>
                  ) : adjMovements.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-[#8C9196]">No adjustments yet</td></tr>
                  ) : (
                    adjMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F6F6F7] transition-colors">
                        <td className="px-5 py-3 text-sm text-[#202223]">{m.product?.name || `Product #${m.productId}`}</td>
                        <td className="px-5 py-3 text-sm text-[#6D7175]">{m.store?.name || `Store #${m.storeId}`}</td>
                        <td className={cn('px-5 py-3 text-sm font-semibold text-right', m.qty > 0 ? 'text-[#008060]' : 'text-[#D72C0D]')}>
                          {m.qty > 0 ? `+${m.qty}` : m.qty}
                        </td>
                        <td className="px-5 py-3 text-sm text-[#6D7175]">{m.reason || '-'}</td>
                        <td className="px-5 py-3 text-sm text-[#8C9196]">{formatDate(m.createdAt)}</td>
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
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-[#E1E3E5] p-6">
            <h3 className="font-semibold text-[#202223] mb-5">Transfer Stock</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Product *</label>
                <select value={trfProductId} onChange={(e) => setTrfProductId(e.target.value)} className={selectClass}>
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">From Store *</label>
                <select value={trfFromStoreId} onChange={(e) => setTrfFromStoreId(e.target.value)} className={selectClass}>
                  <option value="">Select source store...</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">To Store *</label>
                <select value={trfToStoreId} onChange={(e) => setTrfToStoreId(e.target.value)} className={selectClass}>
                  <option value="">Select destination store...</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Quantity *</label>
                <input type="number" min="1" value={trfQty} onChange={(e) => setTrfQty(e.target.value)}
                  placeholder="e.g. 10" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Note</label>
                <input value={trfNote} onChange={(e) => setTrfNote(e.target.value)}
                  placeholder="Optional note" className={inputClass} />
              </div>
            </div>
            <button onClick={handleTransfer} disabled={trfSubmitting}
              className="mt-5 bg-[#008060] hover:bg-[#006E52] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition disabled:opacity-50">
              {trfSubmitting && <Loader2 size={14} className="animate-spin" />}
              <ArrowRight size={14} />
              Transfer Stock
            </button>
          </div>

          {/* Recent transfers */}
          <div className="bg-white rounded-xl border border-[#E1E3E5]">
            <div className="px-5 py-4 border-b border-[#E1E3E5]">
              <h3 className="font-semibold text-[#202223] text-sm">Recent Transfers</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F6F6F7] border-b border-[#E1E3E5]">
                    <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Product</th>
                    <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">From</th>
                    <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">To</th>
                    <th className="text-right text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Qty</th>
                    <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Note</th>
                    <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E1E3E5]">
                  {trfLoading ? (
                    <tr><td colSpan={6} className="text-center py-8 text-[#8C9196]">Loading...</td></tr>
                  ) : trfMovements.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-[#8C9196]">No transfers yet</td></tr>
                  ) : (
                    trfMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F6F6F7] transition-colors">
                        <td className="px-5 py-3 text-sm text-[#202223]">{m.product?.name || `Product #${m.productId}`}</td>
                        <td className="px-5 py-3 text-sm text-[#6D7175]">{m.fromStore?.name || `Store #${m.fromStoreId}`}</td>
                        <td className="px-5 py-3 text-sm text-[#6D7175]">{m.toStore?.name || `Store #${m.toStoreId}`}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-right text-[#202223]">{m.qty}</td>
                        <td className="px-5 py-3 text-sm text-[#6D7175]">{m.note || '-'}</td>
                        <td className="px-5 py-3 text-sm text-[#8C9196]">{formatDate(m.createdAt)}</td>
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
        <div className="bg-white rounded-xl border border-[#E1E3E5]">
          <div className="p-4 flex flex-wrap items-center gap-3 border-b border-[#E1E3E5]">
            <Filter size={16} className="text-[#8C9196]" />
            <select value={histFilterProduct} onChange={(e) => { setHistFilterProduct(e.target.value); setHistPage(1); }}
              className="border border-[#C9CCCF] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060]">
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select value={histFilterStore} onChange={(e) => { setHistFilterStore(e.target.value); setHistPage(1); }}
              className="border border-[#C9CCCF] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060]">
              <option value="">All Stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select value={histFilterType} onChange={(e) => { setHistFilterType(e.target.value); setHistPage(1); }}
              className="border border-[#C9CCCF] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060]">
              <option value="">All Types</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="TRANSFER">Transfer (In & Out)</option>
              <option value="TRANSFER_IN">Transfer In</option>
              <option value="TRANSFER_OUT">Transfer Out</option>
              <option value="SALE">Sale</option>
              <option value="PURCHASE">Purchase</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F6F6F7] border-b border-[#E1E3E5]">
                  <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Product</th>
                  <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Store</th>
                  <th className="text-center text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Type</th>
                  <th className="text-right text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Qty</th>
                  <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Reason / Note</th>
                  <th className="text-left text-xs font-semibold text-[#6D7175] uppercase tracking-wide px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E3E5]">
                {histLoading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-[#8C9196]">Loading...</td></tr>
                ) : histMovements.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-[#8C9196]">No movements found</td></tr>
                ) : (
                  histMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-[#F6F6F7] transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Package size={14} className="text-[#8C9196]" />
                          <span className="text-sm text-[#202223]">{m.product?.name || `Product #${m.productId}`}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-[#6D7175]">{m.store?.name || `Store #${m.storeId}`}</td>
                      <td className="px-5 py-3 text-center">{typeBadge(m.type)}</td>
                      <td className={cn('px-5 py-3 text-sm font-semibold text-right', m.qty > 0 ? 'text-[#008060]' : 'text-[#D72C0D]')}>
                        {m.qty > 0 ? `+${m.qty}` : m.qty}
                      </td>
                      <td className="px-5 py-3 text-sm text-[#6D7175]">{m.reason || m.note || '-'}</td>
                      <td className="px-5 py-3 text-sm text-[#8C9196]">{formatDate(m.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {histTotalPages > 1 && (
            <div className="px-5 py-3 border-t border-[#E1E3E5] flex items-center justify-between">
              <p className="text-sm text-[#6D7175]">
                Page {histPage} of {histTotalPages} ({histTotal} total)
              </p>
              <div className="flex gap-1">
                <button onClick={() => setHistPage(histPage - 1)} disabled={histPage <= 1}
                  className="p-1.5 rounded-lg border border-[#E1E3E5] disabled:opacity-40 hover:bg-[#F6F6F7] transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setHistPage(histPage + 1)} disabled={histPage >= histTotalPages}
                  className="p-1.5 rounded-lg border border-[#E1E3E5] disabled:opacity-40 hover:bg-[#F6F6F7] transition-colors">
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
