'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Percent, Plus, Edit3, Loader2, X, Check } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface TaxRate { id: number; name: string; rate: number; isDefault: boolean; }
const inp = 'w-full border border-[#C9CCCF] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] transition-colors text-[#202223]';

export default function TaxRatesPage() {
  const { user } = useAuthStore();
  const [taxes, setTaxes] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', rate: '', isDefault: false });

  const load = () => { setLoading(true); api.get('/tax-rates').then(({ data }) => setTaxes(data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditId(null); setForm({ name: '', rate: '', isDefault: false }); setShowModal(true); };
  const openEdit = (t: TaxRate) => { setEditId(t.id); setForm({ name: t.name, rate: String(t.rate), isDefault: t.isDefault }); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.rate) { toast.error('Name and rate required'); return; }
    setSaving(true);
    try {
      const p = { name: form.name, rate: Number(form.rate), isDefault: form.isDefault };
      editId ? await api.patch(`/tax-rates/${editId}`, p) : await api.post('/tax-rates', p);
      toast.success(editId ? 'Updated' : 'Created'); setShowModal(false); load();
    } catch { toast.error('Failed to save'); } finally { setSaving(false); }
  };

  const setDefault = async (id: number) => {
    try { await api.patch(`/tax-rates/${id}`, { isDefault: true }); toast.success('Default updated'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#202223]">Tax rates</h1>
          <p className="text-sm text-[#6D7175] mt-0.5">Configure GST and tax slabs for your products</p>
        </div>
        {user?.role !== 'CASHIER' && (
          <button onClick={openCreate} className="flex items-center gap-2 bg-[#008060] hover:bg-[#006E52] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            <Plus size={16} /> Add rate
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#E1E3E5] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F6F6F7] border-b border-[#E1E3E5]">
              {['Name', 'Rate', 'Default', ''].map((h) => (
                <th key={h} className="px-5 py-3 text-xs font-semibold text-[#6D7175] uppercase tracking-wide text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1E3E5]">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 4 }).map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 bg-[#F6F6F7] rounded animate-pulse" /></td>)}</tr>
            )) : taxes.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-16"><Percent size={32} className="text-[#C4CDD5] mx-auto mb-3" /><p className="text-sm font-medium text-[#6D7175]">No tax rates defined</p></td></tr>
            ) : taxes.map((t) => (
              <tr key={t.id} className="hover:bg-[#F6F6F7] transition-colors group">
                <td className="px-5 py-4 text-sm font-semibold text-[#202223]">{t.name}</td>
                <td className="px-5 py-4"><span className="bg-[#EEF3FB] text-[#2C6ECB] text-sm font-bold px-3 py-1 rounded-lg">{t.rate}%</span></td>
                <td className="px-5 py-4">
                  {t.isDefault ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#008060] bg-[#EAF5F0] w-fit px-2.5 py-1 rounded-full"><Check size={12} />Default</span>
                  ) : (
                    <button onClick={() => setDefault(t.id)} disabled={user?.role === 'CASHIER'} className="text-xs font-semibold text-[#6D7175] hover:text-[#008060] transition-colors disabled:pointer-events-none">Set as default</button>
                  )}
                </td>
                <td className="px-5 py-4">
                  {user?.role !== 'CASHIER' && <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#EEF3FB] text-[#8C9196] hover:text-[#2C6ECB] transition-all"><Edit3 size={14} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-[#E1E3E5] shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E1E3E5]">
              <h3 className="font-semibold text-[#202223]">{editId ? 'Edit tax rate' : 'Add tax rate'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-[#8C9196] hover:bg-[#F6F6F7] transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Name *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. GST 18%" className={inp} /></div>
              <div><label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Rate (%) *</label><input required type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="18.00" className={inp} /></div>
              {!editId && <label className="flex items-center gap-2.5 cursor-pointer"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="w-4 h-4 rounded border-[#C9CCCF] accent-[#008060]" /><span className="text-sm font-medium text-[#202223]">Set as default</span></label>}
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
