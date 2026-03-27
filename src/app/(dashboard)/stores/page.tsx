'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Edit3, Trash2, X, Loader2, MapPin, Store } from 'lucide-react';
import api from '@/lib/api';

interface StoreItem {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  _count?: { users: number };
}

interface StoreForm {
  name: string;
  address: string;
  phone: string;
}

const emptyForm: StoreForm = { name: '', address: '', phone: '' };

export default function StoresPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StoreItem | null>(null);
  const [form, setForm] = useState<StoreForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchStores = () => {
    setLoading(true);
    api.get('/stores')
      .then(({ data }) => setStores(data))
      .catch(() => toast.error('Failed to load stores'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStores(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = (s: StoreItem) => {
    setEditing(s);
    setForm({ name: s.name, address: s.address || '', phone: s.phone || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Store name is required'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, address: form.address || null, phone: form.phone || null };
      if (editing) {
        await api.patch(`/stores/${editing.id}`, payload);
        toast.success('Store updated');
      } else {
        await api.post('/stores', payload);
        toast.success('Store created');
      }
      setShowModal(false);
      fetchStores();
    } catch {
      toast.error('Failed to save store');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this store?')) return;
    try {
      await api.delete(`/stores/${id}`);
      toast.success('Store deleted');
      fetchStores();
    } catch {
      toast.error('Failed to delete store');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your store locations</p>
        </div>
        <button onClick={openCreate}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition">
          <Plus size={16} /> Add Store
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-400">Loading...</div>
        ) : stores.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">No stores found</div>
        ) : (
          stores.map((s) => (
            <div key={s.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <Store size={20} />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-500">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{s.name}</h3>
              {s.address && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mb-1">
                  <MapPin size={12} /> {s.address}
                </p>
              )}
              {s.phone && <p className="text-sm text-gray-500">{s.phone}</p>}
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">{s._count?.users ?? 0} staff assigned</span>
                <span className={s.isActive ? 'badge badge-success' : 'badge badge-danger'}>
                  {s.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{editing ? 'Edit Store' : 'Add Store'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
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
