'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Edit3, Truck, Mail, Phone, MapPin, Loader2, X } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Supplier { id: number; name: string; email: string | null; phone: string | null; address: string | null; isActive: boolean; _count?: { purchaseOrders: number }; }
interface Form { name: string; email: string; phone: string; address: string; }
const inp = 'w-full border border-[#C9CCCF] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] transition-colors text-[#202223]';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>({ name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  const fetch = () => {
    setLoading(true);
    api.get('/suppliers').then(({ data }) => setSuppliers(data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, []);

  const filtered = suppliers.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()) || s.phone?.includes(search));

  const openCreate = () => { setEditId(null); setForm({ name: '', email: '', phone: '', address: '' }); setShowModal(true); };
  const openEdit = (s: Supplier) => { setEditId(s.id); setForm({ name: s.name, email: s.email || '', phone: s.phone || '', address: s.address || '' }); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Supplier name is required'); return; }
    setSaving(true);
    try {
      editId ? await api.patch(`/suppliers/${editId}`, form) : await api.post('/suppliers', form);
      toast.success(editId ? 'Supplier updated' : 'Supplier created');
      setShowModal(false); fetch();
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const toggleStatus = async (id: number, current: boolean) => {
    try { await api.patch(`/suppliers/${id}`, { isActive: !current }); toast.success(current ? 'Deactivated' : 'Activated'); fetch(); }
    catch { toast.error('Failed to update'); }
  };

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#202223]">Suppliers</h1>
          <p className="text-sm text-[#6D7175] mt-0.5">Manage your vendors and distributors</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#008060] hover:bg-[#006E52] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={16} /> Add supplier
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#E1E3E5] overflow-hidden">
        <div className="p-4 border-b border-[#E1E3E5]">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9196]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers..."
              className="w-full pl-9 pr-3 py-2 border border-[#C9CCCF] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] bg-[#F6F6F7]" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F6F6F7] border-b border-[#E1E3E5]">
                {['Supplier', 'Contact', 'Address', 'Orders', 'Status', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-[#6D7175] uppercase tracking-wide text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E3E5]">
              {loading ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-[#F6F6F7] rounded animate-pulse" /></td>)}</tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16"><Truck size={32} className="text-[#C4CDD5] mx-auto mb-3" /><p className="text-sm font-medium text-[#6D7175]">No suppliers found</p></td></tr>
              ) : filtered.map((s) => (
                <tr key={s.id} className="hover:bg-[#F6F6F7] transition-colors group">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-[#202223]">{s.name}</p>
                    <p className="text-xs text-[#6D7175] mt-0.5">{s._count?.purchaseOrders ?? 0} purchase orders</p>
                  </td>
                  <td className="px-5 py-4">
                    {s.email && <div className="flex items-center gap-1.5 text-sm text-[#6D7175] mb-1"><Mail size={12} />{s.email}</div>}
                    {s.phone && <div className="flex items-center gap-1.5 text-sm text-[#6D7175]"><Phone size={12} />{s.phone}</div>}
                    {!s.email && !s.phone && <span className="text-xs text-[#8C9196]">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    {s.address ? <div className="flex items-start gap-1.5 text-sm text-[#6D7175] max-w-[180px]"><MapPin size={12} className="mt-0.5 flex-shrink-0" /><span className="line-clamp-2">{s.address}</span></div>
                      : <span className="text-xs text-[#8C9196]">—</span>}
                  </td>
                  <td className="px-5 py-4"><span className="text-sm font-semibold text-[#202223]">{s._count?.purchaseOrders ?? 0}</span></td>
                  <td className="px-5 py-4">
                    <button onClick={() => toggleStatus(s.id, s.isActive)}
                      className={cn('px-2.5 py-1 rounded-full text-xs font-semibold transition-colors', s.isActive ? 'bg-[#EAF5F0] text-[#008060] hover:bg-[#D1EDE7]' : 'bg-[#F6F6F7] text-[#6D7175] hover:bg-[#E1E3E5]')}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#EEF3FB] text-[#8C9196] hover:text-[#2C6ECB] transition-all"><Edit3 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5]">
              <h3 className="font-semibold text-[#202223]">{editId ? 'Edit supplier' : 'Add supplier'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-[#8C9196] hover:bg-[#F6F6F7] transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Company name *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inp} /></div>
                <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inp} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Address</label><textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={cn(inp, 'resize-none')} /></div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-[#6D7175] border border-[#C9CCCF] rounded-lg bg-white hover:bg-[#F6F6F7] transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[#008060] hover:bg-[#006E52] text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                  {saving && <Loader2 size={14} className="animate-spin" />}Save supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
