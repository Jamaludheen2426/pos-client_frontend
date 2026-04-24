'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Edit3, Trash2, X, Loader2, MapPin, Store } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface StoreItem { id: number; name: string; address: string | null; phone: string | null; isActive: boolean; _count?: { users: number }; }
interface Form { name: string; address: string; phone: string; }
const empty: Form = { name: '', address: '', phone: '' };
const inp = 'w-full border border-[#C9CCCF] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] transition-colors text-[#202223]';

export default function StoresPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StoreItem | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);

  const fetch = () => {
    setLoading(true);
    api.get('/stores').then(({ data }) => setStores(data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setShowModal(true); };
  const openEdit = (s: StoreItem) => { setEditing(s); setForm({ name: s.name, address: s.address || '', phone: s.phone || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name) { toast.error('Store name is required'); return; }
    setSaving(true);
    try {
      const p = { name: form.name, address: form.address || null, phone: form.phone || null };
      editing ? await api.patch(`/stores/${editing.id}`, p) : await api.post('/stores', p);
      toast.success(editing ? 'Store updated' : 'Store created');
      setShowModal(false); fetch();
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this store?')) return;
    try { await api.delete(`/stores/${id}`); toast.success('Deleted'); fetch(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#202223]">Stores</h1>
          <p className="text-sm text-[#6D7175] mt-0.5">Manage your store locations</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#008060] hover:bg-[#006E52] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={16} /> Add store
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-white rounded-xl border border-[#E1E3E5] animate-pulse" />)}
        </div>
      ) : stores.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E1E3E5] py-16 text-center">
          <Store size={32} className="text-[#C4CDD5] mx-auto mb-3" />
          <p className="text-sm font-medium text-[#6D7175]">No stores yet</p>
          <button onClick={openCreate} className="mt-3 text-sm font-semibold text-[#008060] hover:underline">Add your first store</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-[#E1E3E5] p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-[#EAF5F0] text-[#008060] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Store size={18} />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-[#EEF3FB] text-[#8C9196] hover:text-[#2C6ECB] transition-colors"><Edit3 size={14} /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-[#FFF4F4] text-[#8C9196] hover:text-[#D72C0D] transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
              <h3 className="font-semibold text-[#202223] mb-2">{s.name}</h3>
              {s.address && <p className="text-sm text-[#6D7175] flex items-start gap-1.5 mb-1"><MapPin size={12} className="mt-0.5 flex-shrink-0" />{s.address}</p>}
              {s.phone && <p className="text-sm text-[#6D7175] mb-2">{s.phone}</p>}
              <div className="pt-3 mt-3 border-t border-[#E1E3E5] flex items-center justify-between">
                <span className="text-xs text-[#6D7175]">{s._count?.users ?? 0} staff</span>
                <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', s.isActive ? 'bg-[#EAF5F0] text-[#008060]' : 'bg-[#F6F6F7] text-[#6D7175]')}>
                  {s.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5]">
              <h3 className="font-semibold text-[#202223]">{editing ? 'Edit store' : 'Add store'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-[#8C9196] hover:bg-[#F6F6F7] transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Store name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} /></div>
              <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inp} /></div>
              <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inp} /></div>
            </div>
            <div className="px-6 py-4 border-t border-[#E1E3E5] flex justify-end gap-3 bg-[#F6F6F7]">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-[#6D7175] border border-[#C9CCCF] rounded-lg bg-white hover:bg-[#F6F6F7] transition-colors">Cancel</button>
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
