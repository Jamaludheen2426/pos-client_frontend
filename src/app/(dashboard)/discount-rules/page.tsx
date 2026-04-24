'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Tag, Plus, Search, Edit3, Loader2, X } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface DiscountRule { id: number; code: string | null; type: 'FLAT' | 'PERCENTAGE'; value: number; minOrderAmt: number | null; maxUses: number | null; usedCount: number; expiresAt: string | null; isActive: boolean; }
const inp = 'w-full border border-[#C9CCCF] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] transition-colors text-[#202223]';

export default function DiscountRulesPage() {
  const { user } = useAuthStore();
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ code: '', type: 'PERCENTAGE', value: '', minOrderAmt: '', maxUses: '', expiresAt: '' });

  const load = () => { setLoading(true); api.get('/discount-rules').then(({ data }) => setRules(data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const filtered = rules.filter((r) => !search || (r.code && r.code.toLowerCase().includes(search.toLowerCase())) || r.type.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditId(null); setForm({ code: '', type: 'PERCENTAGE', value: '', minOrderAmt: '', maxUses: '', expiresAt: '' }); setShowModal(true); };
  const openEdit = (r: DiscountRule) => {
    setEditId(r.id);
    setForm({ code: r.code || '', type: r.type, value: String(r.value), minOrderAmt: r.minOrderAmt ? String(r.minOrderAmt) : '', maxUses: r.maxUses ? String(r.maxUses) : '', expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString().slice(0, 16) : '' });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.value) { toast.error('Value required'); return; }
    setSaving(true);
    try {
      const p = { code: form.code.toUpperCase() || null, type: form.type, value: Number(form.value), minOrderAmt: form.minOrderAmt ? Number(form.minOrderAmt) : null, maxUses: form.maxUses ? Number(form.maxUses) : null, expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null };
      editId ? await api.patch(`/discount-rules/${editId}`, p) : await api.post('/discount-rules', p);
      toast.success(editId ? 'Updated' : 'Created'); setShowModal(false); load();
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const toggleStatus = async (id: number, current: boolean) => {
    try { await api.patch(`/discount-rules/${id}`, { isActive: !current }); toast.success(current ? 'Paused' : 'Activated'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#202223]">Discounts</h1>
          <p className="text-sm text-[#6D7175] mt-0.5">Manage promo codes and discount rules</p>
        </div>
        {user?.role !== 'CASHIER' && (
          <button onClick={openCreate} className="flex items-center gap-2 bg-[#008060] hover:bg-[#006E52] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            <Plus size={16} /> Add discount
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#E1E3E5] overflow-hidden">
        <div className="p-4 border-b border-[#E1E3E5]">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C9196]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search discount codes..."
              className="w-full pl-9 pr-3 py-2 border border-[#C9CCCF] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] bg-[#F6F6F7]" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F6F6F7] border-b border-[#E1E3E5]">
                {['Code', 'Discount', 'Min order', 'Usage', 'Expires', 'Status', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-[#6D7175] uppercase tracking-wide text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E3E5]">
              {loading ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-[#F6F6F7] rounded animate-pulse" /></td>)}</tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16"><Tag size={32} className="text-[#C4CDD5] mx-auto mb-3" /><p className="text-sm font-medium text-[#6D7175]">No discount rules</p></td></tr>
              ) : filtered.map((r) => {
                const expired = r.expiresAt && new Date(r.expiresAt) < new Date();
                const exhausted = r.maxUses && r.usedCount >= r.maxUses;
                const active = r.isActive && !expired && !exhausted;
                return (
                  <tr key={r.id} className="hover:bg-[#F6F6F7] transition-colors group">
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-[#202223] font-mono bg-[#F6F6F7] border border-[#E1E3E5] px-2 py-0.5 rounded">
                        {r.code || 'AUTO'}
                      </span>
                    </td>
                    <td className="px-5 py-4"><span className="bg-[#EAF5F0] text-[#008060] text-sm font-bold px-3 py-1 rounded-lg">{r.type === 'PERCENTAGE' ? `${r.value}%` : `$${r.value}`} OFF</span></td>
                    <td className="px-5 py-4 text-sm text-[#6D7175]">{r.minOrderAmt ? `$${r.minOrderAmt}` : '—'}</td>
                    <td className="px-5 py-4 text-sm text-[#6D7175]">{r.usedCount}{r.maxUses ? ` / ${r.maxUses}` : ''}</td>
                    <td className="px-5 py-4 text-sm text-[#6D7175]">{r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-4">
                      <button onClick={() => toggleStatus(r.id, r.isActive)} disabled={user?.role === 'CASHIER'}
                        className={cn('px-2.5 py-1 rounded-full text-xs font-semibold transition-colors', active ? 'bg-[#EAF5F0] text-[#008060] hover:bg-[#D1EDE7]' : 'bg-[#F6F6F7] text-[#6D7175] hover:bg-[#E1E3E5]', user?.role === 'CASHIER' && 'pointer-events-none')}>
                        {active ? 'Active' : expired ? 'Expired' : exhausted ? 'Exhausted' : 'Paused'}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      {user?.role !== 'CASHIER' && <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#EEF3FB] text-[#8C9196] hover:text-[#2C6ECB] transition-all"><Edit3 size={14} /></button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5]">
              <h3 className="font-semibold text-[#202223]">{editId ? 'Edit discount' : 'Add discount'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-[#8C9196] hover:bg-[#F6F6F7] transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Promo code (blank = automatic)</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SUMMER20" className={cn(inp, 'uppercase')} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inp}>
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat ($)</option>
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Value *</label><input required type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="20" className={inp} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Min order amount</label><input type="number" step="0.01" value={form.minOrderAmt} onChange={(e) => setForm({ ...form, minOrderAmt: e.target.value })} placeholder="100.00" className={inp} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Max uses</label><input type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="Unlimited" className={inp} /></div>
                <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Expires at</label><input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className={inp} /></div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-semibold text-[#6D7175] border border-[#C9CCCF] rounded-lg bg-white hover:bg-[#F6F6F7] transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[#008060] hover:bg-[#006E52] text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">{saving && <Loader2 size={14} className="animate-spin" />}Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
