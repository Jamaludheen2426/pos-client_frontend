'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Edit3, Trash2, X, Loader2, ChevronLeft, ChevronRight, UserCircle } from 'lucide-react';
import api from '@/lib/api';

interface Customer {
  id: number; name: string; email: string | null; phone: string | null;
  address: string | null; loyaltyPoints: number; createdAt: string;
}
interface Form { name: string; email: string; phone: string; address: string; }
const empty: Form = { name: '', email: '', phone: '', address: '' };
const inp = 'w-full border border-[#C9CCCF] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] transition-colors text-[#202223]';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetch = () => {
    setLoading(true);
    api.get('/customers').then(({ data }) => setCustomers(data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, []);

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
  });
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openCreate = () => { setEditing(null); setForm(empty); setShowModal(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const p = { name: form.name, email: form.email || null, phone: form.phone || null, address: form.address || null };
      editing ? await api.patch(`/customers/${editing.id}`, p) : await api.post('/customers', p);
      toast.success(editing ? 'Customer updated' : 'Customer created');
      setShowModal(false); fetch();
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this customer?')) return;
    try { await api.delete(`/customers/${id}`); toast.success('Deleted'); fetch(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#202223]">Customers</h1>
          <p className="text-sm text-[#6D7175] mt-0.5">Manage your customer database</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#008060] hover:bg-[#006E52] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={16} /> Add customer
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#E1E3E5] overflow-hidden">
        <div className="p-4 border-b border-[#E1E3E5]">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9196]" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search customers..."
              className="w-full pl-9 pr-3 py-2 border border-[#C9CCCF] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] bg-[#F6F6F7]" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F6F6F7] border-b border-[#E1E3E5]">
                {['Customer', 'Email', 'Phone', 'Loyalty pts', 'Joined', ''].map((h, i) => (
                  <th key={i} className={`px-5 py-3 text-xs font-semibold text-[#6D7175] uppercase tracking-wide ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E3E5]">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-5 py-3.5"><div className="h-4 bg-[#F6F6F7] rounded animate-pulse" /></td>)}</tr>
              )) : paginated.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16">
                  <UserCircle size={32} className="text-[#C4CDD5] mx-auto mb-3" />
                  <p className="text-sm font-medium text-[#6D7175]">No customers found</p>
                </td></tr>
              ) : paginated.map((c) => (
                <tr key={c.id} className="hover:bg-[#F6F6F7] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#EAF5F0] text-[#008060] rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-[#202223]">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#6D7175]">{c.email || '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-[#6D7175]">{c.phone || '—'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm font-bold text-[#202223]">{c.loyaltyPoints}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#6D7175]">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-[#EEF3FB] text-[#8C9196] hover:text-[#2C6ECB] transition-colors"><Edit3 size={14} /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-[#FFF4F4] text-[#8C9196] hover:text-[#D72C0D] transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
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
          <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5]">
              <h3 className="font-semibold text-[#202223]">{editing ? 'Edit customer' : 'Add customer'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-[#8C9196] hover:bg-[#F6F6F7] transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} /></div>
              <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inp} /></div>
              <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inp} /></div>
              <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Address</label><textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className={inp} /></div>
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
