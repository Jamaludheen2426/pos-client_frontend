'use client';

import { useEffect, useState } from 'react';
import { Percent, Plus, Search, Edit2, Loader2, Play, Pause, BadgePercent, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface TaxRate {
  id: number;
  name: string;
  rate: number;
  isDefault: boolean;
}

export default function TaxRatesPage() {
  const { user } = useAuthStore();
  const [taxes, setTaxes] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    rate: '',
    isDefault: false
  });

  const loadTaxes = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/tax-rates');
      setTaxes(data);
    } catch {
      toast.error('Failed to load tax rates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTaxes(); }, []);

  const handleOpenModal = (tax?: TaxRate) => {
    if (tax) {
      setEditId(tax.id);
      setFormData({
        name: tax.name,
        rate: tax.rate.toString(),
        isDefault: tax.isDefault
      });
    } else {
      setEditId(null);
      setFormData({ name: '', rate: '', isDefault: false });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.rate) return toast.error('Name & rate required');
    
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        rate: Number(formData.rate),
        isDefault: formData.isDefault
      };

      if (editId) {
        await api.patch(`/tax-rates/${editId}`, payload);
        toast.success('Tax rate updated');
      } else {
        await api.post('/tax-rates', payload);
        toast.success('Tax rate created');
      }
      setIsModalOpen(false);
      loadTaxes();
    } catch {
      toast.error('Failed to save tax rate');
    } finally {
      setSaving(false);
    }
  };

  const setAsDefault = async (id: number) => {
    try {
      // Assuming patch handles making others not-default if setting one as default
      await api.patch(`/tax-rates/${id}`, { isDefault: true });
      toast.success('Default tax rate updated');
      loadTaxes();
    } catch {
      toast.error('Failed to update default');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center">
            <Percent size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tax Profiles</h1>
            <p className="text-sm text-slate-500 font-medium">Manage GST, VAT, and specific product taxes</p>
          </div>
        </div>
        {user?.role !== 'CASHIER' && (
          <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-sky-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-sky-700 transition shadow-sm shadow-sky-600/20">
            <Plus size={18} /> Add Tax Rate
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        <div className="flex-1 overflow-x-auto">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-[300px] text-slate-400 space-y-4">
                <Loader2 size={32} className="animate-spin text-sky-600" />
                <p className="font-medium">Loading taxes...</p>
             </div>
          ) : taxes.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-[300px] text-slate-400 space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center"><BadgePercent size={24} className="text-slate-300" /></div>
                <p className="font-medium text-slate-500">No tax rates defined. Products will have 0% tax by default.</p>
             </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                  <th className="p-4 pl-6">Tax Name</th>
                  <th className="p-4">Rate (%)</th>
                  <th className="p-4">Default</th>
                  {user?.role !== 'CASHIER' && <th className="p-4 text-right pr-6">Options</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {taxes.map((tax) => (
                  <tr key={tax.id} className="hover:bg-slate-50/80 transition group">
                    <td className="p-4 pl-6 font-bold text-slate-900 text-sm">{tax.name}</td>
                    <td className="p-4">
                      <span className="font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-lg text-sm border border-sky-100">
                         {tax.rate}%
                      </span>
                    </td>
                    <td className="p-4">
                      {tax.isDefault ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-md"><CheckCircle size={14}/> Default</span>
                      ) : (
                         <button onClick={() => setAsDefault(tax.id)} className="text-xs font-semibold text-slate-400 hover:text-sky-600 transition" disabled={user?.role === 'CASHIER'}>Set as Default</button>
                      )}
                    </td>
                    {user?.role !== 'CASHIER' && (
                      <td className="p-4 text-right pr-6">
                        <button onClick={() => handleOpenModal(tax)} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg opacity-0 group-hover:opacity-100 transition"><Edit2 size={16} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-in fade-in zoom-in-95">
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
               <h3 className="text-lg font-bold">{editId ? 'Edit Tax Rate' : 'New Tax Rate'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Plus size={24} className="rotate-45" /></button>
             </div>
             
             <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Profile Name *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none text-sm" placeholder="e.g. Standard GST" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Percentage (%) *</label>
                  <input required type="number" step="0.01" value={formData.rate} onChange={e => setFormData({...formData, rate: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 outline-none text-sm" placeholder="18.00" />
                </div>
                {!editId && (
                  <label className="flex items-center gap-2 cursor-pointer mt-4 group">
                    <input type="checkbox" checked={formData.isDefault} onChange={e => setFormData({...formData, isDefault: e.target.checked})} className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-600" />
                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition">Set as default rate for new products</span>
                  </label>
                )}
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-semibold hover:bg-slate-100 rounded-xl">Cancel</button>
                  <button type="submit" disabled={saving} className="px-5 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl disabled:opacity-70">Save</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
