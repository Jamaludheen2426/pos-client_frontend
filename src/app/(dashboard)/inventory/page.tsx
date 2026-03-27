'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Search, Plus, Edit3, Trash2, Package, Filter, Download, Upload,
  ChevronLeft, ChevronRight, X, Loader2, AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Product {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  basePrice: number;
  reorderLevel: number;
  imageUrl: string | null;
  isActive: boolean;
  category: string | null;
  variants: unknown[];
  _stockQty?: number;
}

interface ProductForm {
  name: string;
  sku: string;
  barcode: string;
  basePrice: string;
  reorderLevel: string;
  categoryId: string;
  imageUrl: string;
}

const emptyForm: ProductForm = {
  name: '', sku: '', barcode: '', basePrice: '',
  reorderLevel: '10', categoryId: '', imageUrl: '',
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchProducts = () => {
    setLoading(true);
    Promise.all([
      api.get('/products?limit=1000'),
      api.get('/products/stock').catch(() => ({ data: [] })),
    ])
      .then(([prodRes, stockRes]) => {
        const prods = prodRes.data.products || prodRes.data;
        const stockMap: Record<number, number> = {};
        if (Array.isArray(stockRes.data)) {
          for (const s of stockRes.data) {
            stockMap[s.productId] = (stockMap[s.productId] || 0) + Number(s.qty);
          }
        }
        setProducts(prods.map((p: Product) => ({ ...p, _stockQty: stockMap[p.id] ?? 0 })));
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, []);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q);
    if (!matchSearch) return false;

    const totalStock = p._stockQty ?? 0;
    if (filter === 'low') return totalStock > 0 && totalStock <= p.reorderLevel;
    if (filter === 'out') return totalStock <= 0;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || '',
      basePrice: String(p.basePrice),
      reorderLevel: String(p.reorderLevel),
      categoryId: '',
      imageUrl: p.imageUrl || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.sku || !form.basePrice) {
      toast.error('Name, SKU, and price are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        barcode: form.barcode || null,
        basePrice: Number(form.basePrice),
        reorderLevel: Number(form.reorderLevel) || 10,
        imageUrl: form.imageUrl || null,
      };
      if (editing) {
        await api.patch(`/products/${editing.id}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/products', payload);
        toast.success('Product created');
      }
      setShowModal(false);
      fetchProducts();
    } catch {
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch {
      toast.error('Failed to delete');
    }
  };

  /* Skeleton row for loading state */
  const SkeletonRow = () => (
    <tr>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 bg-gray-200 rounded-md animate-pulse" />
            <div className="h-3 w-16 bg-gray-100 rounded-md animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5"><div className="h-3.5 w-20 bg-gray-200 rounded-md animate-pulse" /></td>
      <td className="px-5 py-3.5"><div className="h-3.5 w-14 bg-gray-200 rounded-md animate-pulse ml-auto" /></td>
      <td className="px-5 py-3.5"><div className="h-3.5 w-10 bg-gray-200 rounded-md animate-pulse ml-auto" /></td>
      <td className="px-5 py-3.5"><div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse mx-auto" /></td>
      <td className="px-5 py-3.5"><div className="h-6 w-14 bg-gray-200 rounded-md animate-pulse ml-auto" /></td>
    </tr>
  );

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Package size={20} className="text-blue-600" />
            </div>
            Inventory
          </h1>
          <p className="text-gray-500 text-sm mt-1.5 ml-[44px]">Manage your products and stock levels</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Main Card with gradient accent */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {/* Gradient accent bar */}
        <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500" />

        {/* Filters */}
        <div className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50/50"
            />
          </div>
          <div className="flex gap-1 bg-gray-100/80 rounded-xl p-1">
            {(['all', 'low', 'out'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-gray-100 bg-gray-50/60">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Product</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">SKU</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Price</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Stock</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-gray-100 rounded-2xl">
                        <Package size={28} className="text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">No products found</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {search ? 'Try adjusting your search or filter criteria' : 'Get started by adding your first product'}
                        </p>
                      </div>
                      {!search && (
                        <button
                          onClick={openCreate}
                          className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus size={14} /> Add Product
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((p) => {
                  const totalStock = p._stockQty ?? 0;
                  const isLow = totalStock > 0 && totalStock <= p.reorderLevel;
                  const isOut = totalStock <= 0;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt="" className="w-full h-full object-contain rounded-xl" />
                            ) : (
                              <Package size={16} className="text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.name}</p>
                            {p.category && <p className="text-xs text-gray-400">{p.category}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600 font-mono">{p.sku}</td>
                      <td className="px-5 py-3 text-sm font-medium text-gray-900 text-right">${Number(p.basePrice).toFixed(2)}</td>
                      <td className="px-5 py-3 text-sm text-right">
                        <span className={cn('font-semibold', isOut ? 'text-red-500' : isLow ? 'text-amber-600' : 'text-gray-900')}>
                          {totalStock}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 ring-1 ring-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-100 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-gray-100 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden border border-gray-100">
            {/* Modal gradient accent */}
            <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 rounded-lg">
                  {editing ? <Edit3 size={14} className="text-blue-600" /> : <Plus size={14} className="text-blue-600" />}
                </div>
                {editing ? 'Edit Product' : 'Add Product'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-10rem)]">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                  <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                  <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                  <input type="number" step="0.01" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Level</label>
                  <input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm hover:shadow-md">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
