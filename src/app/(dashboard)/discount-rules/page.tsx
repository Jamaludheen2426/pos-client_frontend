'use client';

import { useEffect, useState } from 'react';
import { Tag, Plus, Search, Edit2, Loader2, Play, Pause, Calendar, Scissors } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface DiscountRule {
  id: number;
  code: string | null;
  type: 'FLAT' | 'PERCENTAGE';
  value: number;
  minOrderAmt: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
}

export default function DiscountRulesPage() {
  const { user } = useAuthStore();
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    code: '',
    type: 'PERCENTAGE',
    value: '',
    minOrderAmt: '',
    maxUses: '',
    expiresAt: ''
  });

  const loadRules = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/discount-rules');
      setRules(data);
    } catch {
      toast.error('Failed to load discount rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRules(); }, []);

  const handleOpenModal = (rule?: DiscountRule) => {
    if (rule) {
      setEditId(rule.id);
      setFormData({
        code: rule.code || '',
        type: rule.type,
        value: rule.value.toString(),
        minOrderAmt: rule.minOrderAmt ? rule.minOrderAmt.toString() : '',
        maxUses: rule.maxUses ? rule.maxUses.toString() : '',
        expiresAt: rule.expiresAt ? new Date(rule.expiresAt).toISOString().slice(0, 16) : ''
      });
    } else {
      setEditId(null);
      setFormData({ code: '', type: 'PERCENTAGE', value: '', minOrderAmt: '', maxUses: '', expiresAt: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.value) return toast.error('Discount value is required');
    
    setSaving(true);
    try {
      const payload = {
        code: formData.code.toUpperCase() || null,
        type: formData.type,
        value: Number(formData.value),
        minOrderAmt: formData.minOrderAmt ? Number(formData.minOrderAmt) : null,
        maxUses: formData.maxUses ? Number(formData.maxUses) : null,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      };

      if (editId) {
        await api.patch(`/discount-rules/${editId}`, payload);
        toast.success('Discount rule updated');
      } else {
        await api.post('/discount-rules', payload);
        toast.success('Discount rule created');
      }
      setIsModalOpen(false);
      loadRules();
    } catch {
      toast.error('Failed to save discount rule');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: number, current: boolean) => {
    try {
      await api.patch(`/discount-rules/${id}`, { isActive: !current });
      toast.success(`Rule ${!current ? 'activated' : 'paused'}`);
      loadRules();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filteredRules = rules.filter(r => 
    (r.code && r.code.toLowerCase().includes(search.toLowerCase())) || 
    r.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center">
            <Tag size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Discount Rules</h1>
            <p className="text-sm text-slate-500 font-medium">Manage promotions, coupons, and flat discounts</p>
          </div>
        </div>
        {user?.role !== 'CASHIER' && (
          <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-pink-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-pink-700 transition shadow-sm shadow-pink-600/20">
            <Plus size={18} /> New Promo Code
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search codes..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-sm outline-none" />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 space-y-4">
                <Loader2 size={32} className="animate-spin text-pink-600" />
                <p className="font-medium">Loading rules...</p>
             </div>
          ) : filteredRules.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center"><Tag size={24} className="text-slate-300" /></div>
                <p className="font-medium text-slate-500">No discount rules found.</p>
             </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                  <th className="p-4 pl-6">Promo Code</th>
                  <th className="p-4">Discount Value</th>
                  <th className="p-4">Conditions</th>
                  <th className="p-4">Usage</th>
                  <th className="p-4">Status</th>
                  {user?.role !== 'CASHIER' && <th className="p-4 text-right pr-6">Options</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRules.map((rule) => {
                  const isExpired = rule.expiresAt && new Date(rule.expiresAt) < new Date();
                  const isExhausted = rule.maxUses && rule.usedCount >= rule.maxUses;
                  const canUse = rule.isActive && !isExpired && !isExhausted;

                  return (
                    <tr key={rule.id} className="hover:bg-slate-50/80 transition group">
                      <td className="p-4 pl-6">
                        <div className="font-bold text-slate-900 text-sm mb-1">{rule.code || 'Automatic Discount'}</div>
                        {rule.expiresAt && <div className="text-xs flex items-center gap-1 text-slate-500"><Calendar size={12} /> {new Date(rule.expiresAt).toLocaleDateString()}</div>}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-pink-600 bg-pink-50 px-3 py-1 rounded-lg text-sm border border-pink-100">
                           {rule.type === 'PERCENTAGE' ? `${rule.value}% OFF` : `$${rule.value} OFF`}
                        </span>
                      </td>
                      <td className="p-4">
                        {rule.minOrderAmt ? (
                           <div className="text-xs text-slate-600"><span className="font-semibold">Min order:</span> ${rule.minOrderAmt}</div>
                        ) : <span className="text-xs text-slate-400 italic">No minimum</span>}
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-semibold text-slate-700">{rule.usedCount} <span className="text-slate-400 font-normal">used</span></div>
                        {rule.maxUses && <div className="text-xs text-slate-500">of {rule.maxUses} uses limit</div>}
                      </td>
                      <td className="p-4">
                        <button onClick={() => toggleStatus(rule.id, rule.isActive)} disabled={user?.role === 'CASHIER'} className={cn("px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none transition flex items-center gap-1", canUse ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100", user?.role === 'CASHIER' && "pointer-events-none opacity-80")}>
                          {canUse ? <Play size={10} /> : <Pause size={10} />}
                          {canUse ? 'Active' : isExpired ? 'Expired' : isExhausted ? 'Exhausted' : 'Paused'}
                        </button>
                      </td>
                      {user?.role !== 'CASHIER' && (
                        <td className="p-4 text-right pr-6">
                          <button onClick={() => handleOpenModal(rule)} className="p-2 text-slate-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg opacity-0 group-hover:opacity-100 transition"><Edit2 size={16} /></button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-in fade-in zoom-in-95">
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
               <h3 className="text-lg font-bold">{editId ? 'Edit Rule' : 'New Rule'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Plus size={24} className="rotate-45" /></button>
             </div>
             
             <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Promo Code (Leave blank for automatic)</label>
                  <input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none uppercase text-sm" placeholder="SUMMER50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Type</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as 'FLAT' | 'PERCENTAGE'})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none">
                       <option value="PERCENTAGE">Percentage (%)</option>
                       <option value="FLAT">Flat Rate ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Value *</label>
                    <input required type="number" step="0.01" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none text-sm" placeholder="20" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Minimum Order Amount (Optional)</label>
                  <input type="number" step="0.01" value={formData.minOrderAmt} onChange={e => setFormData({...formData, minOrderAmt: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" placeholder="100.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Usages (Optional)</label>
                  <input type="number" value={formData.maxUses} onChange={e => setFormData({...formData, maxUses: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" placeholder="e.g. 100 first customers" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expiration Date (Optional)</label>
                  <input type="datetime-local" value={formData.expiresAt} onChange={e => setFormData({...formData, expiresAt: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-semibold hover:bg-slate-100 rounded-xl">Cancel</button>
                  <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-xl">Save</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
