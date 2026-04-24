'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Plus, Edit3, X, Loader2, UserCheck, UserX, Users } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface User { id: number; name: string; email: string; role: string; storeId: number; store: { id: number; name: string } | null; isActive: boolean; createdAt: string; }
interface StoreOption { id: number; name: string; }
interface Form { name: string; email: string; password: string; role: string; storeId: string; }
const empty: Form = { name: '', email: '', password: '', role: 'CASHIER', storeId: '' };
const inp = 'w-full border border-[#C9CCCF] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] transition-colors text-[#202223]';

const roleBadge = (role: string) => {
  if (role === 'OWNER') return 'bg-[#EEF3FB] text-[#2C6ECB]';
  if (role === 'MANAGER') return 'bg-[#FFF4E4] text-[#B25000]';
  return 'bg-[#EAF5F0] text-[#008060]';
};

export default function StaffPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);

  const fetch = () => {
    setLoading(true);
    Promise.all([api.get('/users').then(({ data }) => setUsers(data)), api.get('/stores').then(({ data }) => setStores(data))])
      .catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, []);

  const filtered = users.filter((u) => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditing(null); setForm({ ...empty, storeId: stores[0]?.id ? String(stores[0].id) : '' }); setShowModal(true); };
  const openEdit = (u: User) => { setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role, storeId: String(u.storeId) }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name || !form.email) { toast.error('Name and email required'); return; }
    if (!editing && !form.password) { toast.error('Password required for new user'); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { name: form.name, email: form.email, role: form.role, storeId: Number(form.storeId) };
      if (form.password) payload.password = form.password;
      editing ? await api.patch(`/users/${editing.id}`, payload) : await api.post('/users', payload);
      toast.success(editing ? 'User updated' : 'User created');
      setShowModal(false); fetch();
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const toggleActive = async (u: User) => {
    try { await api.patch(`/users/${u.id}`, { isActive: !u.isActive }); toast.success(u.isActive ? 'User deactivated' : 'User activated'); fetch(); }
    catch { toast.error('Failed to update'); }
  };

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#202223]">Staff</h1>
          <p className="text-sm text-[#6D7175] mt-0.5">Manage team members and their roles</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#008060] hover:bg-[#006E52] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={16} /> Add staff
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#E1E3E5] overflow-hidden">
        <div className="p-4 border-b border-[#E1E3E5]">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9196]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff..."
              className="w-full pl-9 pr-3 py-2 border border-[#C9CCCF] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] bg-[#F6F6F7]" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F6F6F7] border-b border-[#E1E3E5]">
                {['Staff member', 'Email', 'Role', 'Store', 'Status', ''].map((h, i) => (
                  <th key={i} className="px-5 py-3 text-xs font-semibold text-[#6D7175] uppercase tracking-wide text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E3E5]">
              {loading ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-5 py-3.5"><div className="h-4 bg-[#F6F6F7] rounded animate-pulse" /></td>)}</tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16"><Users size={32} className="text-[#C4CDD5] mx-auto mb-3" /><p className="text-sm font-medium text-[#6D7175]">No staff found</p></td></tr>
              ) : filtered.map((u) => (
                <tr key={u.id} className="hover:bg-[#F6F6F7] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-[#202223]">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-[#6D7175]">{u.email}</td>
                  <td className="px-5 py-3.5"><span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', roleBadge(u.role))}>{u.role}</span></td>
                  <td className="px-5 py-3.5 text-sm text-[#6D7175]">{u.store?.name || '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', u.isActive ? 'bg-[#EAF5F0] text-[#008060]' : 'bg-[#F6F6F7] text-[#6D7175]')}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-[#EEF3FB] text-[#8C9196] hover:text-[#2C6ECB] transition-colors"><Edit3 size={14} /></button>
                      <button onClick={() => toggleActive(u)} className="p-1.5 rounded-lg hover:bg-[#FFF4E4] text-[#8C9196] hover:text-[#B25000] transition-colors">
                        {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                    </div>
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
              <h3 className="font-semibold text-[#202223]">{editing ? 'Edit staff member' : 'Add staff member'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-[#8C9196] hover:bg-[#F6F6F7] transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} /></div>
              <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Email *</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inp} /></div>
              <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Password {editing ? '(leave blank to keep)' : '*'}</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inp} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inp}>
                    <option value="CASHIER">Cashier</option>
                    <option value="MANAGER">Manager</option>
                    <option value="OWNER">Owner</option>
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Store</label>
                  <select value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })} className={inp}>
                    {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
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
