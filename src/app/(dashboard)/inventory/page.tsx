'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Edit3, Trash2, Package, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Product {
  id: number; name: string; sku: string; barcode: string | null;
  basePrice: number; reorderLevel: number; imageUrl: string | null;
  isActive: boolean; category: string | null; variants: unknown[];
  _stockQty?: number;
}
interface ProductForm {
  name: string; sku: string; barcode: string; basePrice: string;
  reorderLevel: string; imageUrl: string;
}

const empty: ProductForm = { name: '', sku: '', barcode: '', basePrice: '', reorderLevel: '10', imageUrl: '' };

const inp = 'w-full border border-[#C9CCCF] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] transition-colors text-[#202223]';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(empty);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetch = () => {
    setLoading(true);
    Promise.all([api.get('/products?limit=1000'), api.get('/products/stock').catch(() => ({ data: [] }))])
      .then(([pr, sr]) => {
        const prods = pr.data.products || pr.data;
        const sm: Record<number, number> = {};
        if (Array.isArray(sr.data)) sr.data.forEach((s: { productId: number; qty: string }) => { sm[s.productId] = (sm[s.productId] || 0) + Number(s.qty); });
        setProducts(prods.map((p: Product) => ({ ...p, _stockQty: sm[p.id] ?? 0 })));
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, []);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const ms = !search || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q);
    if (!ms) return false;
    const s = p._stockQty ?? 0;
    if (filter === 'low') return s > 0 && s <= p.reorderLevel;
    if (filter === 'out') return s <= 0;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openCreate = () => { setEditing(null); setForm(empty); setShowModal(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku, barcode: p.barcode || '', basePrice: String(p.basePrice), reorderLevel: String(p.reorderLevel), imageUrl: p.imageUrl || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.sku || !form.basePrice) { toast.error('Name, SKU and price required'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, sku: form.sku, barcode: form.barcode || null, basePrice: Number(form.basePrice), reorderLevel: Number(form.reorderLevel) || 10, imageUrl: form.imageUrl || null };
      editing ? await api.patch(`/products/${editing.id}`, payload) : await api.post('/products', payload);
      toast.success(editing ? 'Product updated' : 'Product created');
      setShowModal(false); fetch();
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product?')) return;
    try { await api.delete(`/products/${id}`); toast.success('Deleted'); fetch(); }
    catch { toast.error('Failed to delete'); }
  };

  const badge = (stock: number, reorder: number) => {
    if (stock <= 0) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFF4F4] text-[#D72C0D]"><span className="w-1.5 h-1.5 rounded-full bg-[#D72C0D]" />Out of stock</span>;
    if (stock <= reorder) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FFF4E4] text-[#B25000]"><span className="w-1.5 h-1.5 rounded-full bg-[#B25000]" />Low stock</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EAF5F0] text-[#008060]"><span className="w-1.5 h-1.5 rounded-full bg-[#008060]" />In stock</span>;
  };

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#202223]">Inventory</h1>
          <p className="text-sm text-[#6D7175] mt-0.5">Manage your products and stock levels</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#008060] hover:bg-[#006E52] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={16} /> Add product
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#E1E3E5] overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-[#E1E3E5]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9196]" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search products..." className="w-full pl-9 pr-3 py-2 border border-[#C9CCCF] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] bg-[#F6F6F7]" />
          </div>
          <div className="flex gap-1 p-1 bg-[#F6F6F7] rounded-lg border border-[#E1E3E5]">
            {(['all', 'low', 'out'] as const).map((f) => (
              <button key={f} onClick={() => { setFilter(f); setPage(1); }}
                className={cn('px-3 py-1.5 rounded-md text-xs font-semibold transition-colors', filter === f ? 'bg-white shadow-sm text-[#202223]' : 'text-[#6D7175] hover:text-[#202223]')}>
                {f === 'all' ? 'All' : f === 'low' ? 'Low stock' : 'Out of stock'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F6F6F7] border-b border-[#E1E3E5]">
                {['Product', 'SKU', 'Price', 'Stock', 'Status', ''].map((h, i) => (
                  <th key={i} className={cn('px-5 py-3 text-xs font-semibold text-[#6D7175] uppercase tracking-wide', i >= 2 && i <= 3 ? 'text-right' : i === 4 ? 'text-center' : 'text-left')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E3E5]">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-5 py-3.5"><div className="h-4 bg-[#F6F6F7] rounded animate-pulse" /></td>
                  ))}
                </tr>
              )) : paginated.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16">
                  <Package size={32} className="text-[#C4CDD5] mx-auto mb-3" />
                  <p className="text-sm font-medium text-[#6D7175]">No products found</p>
                </td></tr>
              ) : paginated.map((p) => {
                const stock = p._stockQty ?? 0;
                return (
                  <tr key={p.id} className="hover:bg-[#F6F6F7] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#F6F6F7] rounded-lg flex items-center justify-center flex-shrink-0 border border-[#E1E3E5]">
                          {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-contain rounded-lg" /> : <Package size={14} className="text-[#8C9196]" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#202223]">{p.name}</p>
                          {p.category && <p className="text-xs text-[#6D7175]">{p.category}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#6D7175] font-mono">{p.sku}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-[#202223] text-right">${Number(p.basePrice).toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-right"><span className={cn('text-sm font-bold', stock <= 0 ? 'text-[#D72C0D]' : stock <= p.reorderLevel ? 'text-[#B25000]' : 'text-[#202223]')}>{stock}</span></td>
                    <td className="px-5 py-3.5 text-center">{badge(stock, p.reorderLevel)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-[#EEF3FB] text-[#8C9196] hover:text-[#2C6ECB] transition-colors"><Edit3 size={14} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-[#FFF4F4] text-[#8C9196] hover:text-[#D72C0D] transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5]">
              <h3 className="font-semibold text-[#202223]">{editing ? 'Edit product' : 'Add product'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-[#8C9196] hover:text-[#202223] hover:bg-[#F6F6F7] transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <div>
                <label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Product name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">SKU *</label><input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={inp} /></div>
                <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Barcode</label><input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className={inp} /></div>
                <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Price *</label><input type="number" step="0.01" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} className={inp} /></div>
                <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Reorder level</label><input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} className={inp} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Image URL</label><input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className={inp} /></div>
            </div>
            <div className="px-6 py-4 border-t border-[#E1E3E5] flex justify-end gap-3 bg-[#F6F6F7]">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-[#6D7175] hover:text-[#202223] border border-[#C9CCCF] rounded-lg bg-white hover:bg-[#F6F6F7] transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-[#008060] hover:bg-[#006E52] text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                {saving && <Loader2 size={14} className="animate-spin" />}{editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
