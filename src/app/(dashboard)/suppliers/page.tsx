'use client';

import { useEffect, useState } from 'react';
import { Truck, Plus, Search, Edit2, Trash2, Mail, Phone, MapPin, Loader2, ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface Supplier {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  _count?: { purchaseOrders: number };
}

export default function SuppliersPage() {
  const { user } = useAuthStore();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/suppliers');
      setSuppliers(data);
    } catch (error) {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSuppliers(); }, []);

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditId(supplier.id);
      setFormData({
        name: supplier.name,
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || ''
      });
    } else {
      setEditId(null);
      setFormData({ name: '', email: '', phone: '', address: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Supplier name is required');
    
    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/suppliers/${editId}`, formData);
        toast.success('Supplier updated successfully');
      } else {
        await api.post('/suppliers', formData);
        toast.success('Supplier created successfully');
      }
      setIsModalOpen(false);
      loadSuppliers();
    } catch (error) {
      toast.error('Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await api.patch(`/suppliers/${id}`, { isActive: !currentStatus });
      toast.success(`Supplier ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadSuppliers();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
    (s.phone && s.phone.includes(search))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Truck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Suppliers</h1>
            <p className="text-sm text-slate-500 font-medium">Manage your vendors and distributors</p>
          </div>
        </div>
        
        {user?.role !== 'CASHIER' && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition shadow-sm shadow-indigo-600/20"
          >
            <Plus size={18} /> Add Supplier
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search suppliers by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-x-auto">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 space-y-4">
                <Loader2 size={32} className="animate-spin text-indigo-600" />
                <p className="font-medium">Loading suppliers...</p>
             </div>
          ) : filteredSuppliers.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center"><Truck size={24} className="text-slate-300" /></div>
                <p className="font-medium text-slate-500">No suppliers found.</p>
             </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="p-4 pl-6">Supplier Details</th>
                  <th className="p-4 hidden sm:table-cell">Contact Info</th>
                  <th className="p-4 hidden md:table-cell w-64">Address</th>
                  <th className="p-4">Status</th>
                  {user?.role !== 'CASHIER' && <th className="p-4 text-right pr-6">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50/80 transition group">
                    <td className="p-4 pl-6 align-top">
                      <div className="font-bold text-slate-900 text-sm mb-1">{supplier.name}</div>
                      <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 inline-flex items-center px-2 py-0.5 rounded-md">
                        {supplier._count?.purchaseOrders || 0} Purchase Orders
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell align-top space-y-2">
                       {supplier.email ? (
                         <div className="flex items-center gap-2 text-sm text-slate-600"><Mail size={14} className="text-slate-400" /> {supplier.email}</div>
                       ) : <span className="text-xs text-slate-400 italic">No email</span>}
                       {supplier.phone ? (
                         <div className="flex items-center gap-2 text-sm text-slate-600"><Phone size={14} className="text-slate-400" /> {supplier.phone}</div>
                       ) : <span className="text-xs text-slate-400 italic">No phone</span>}
                    </td>
                    <td className="p-4 hidden md:table-cell align-top">
                      {supplier.address ? (
                        <div className="flex items-start gap-2 text-sm text-slate-600 max-w-xs">
                          <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{supplier.address}</span>
                        </div>
                      ) : <span className="text-xs text-slate-400 italic">No address provided</span>}
                    </td>
                    <td className="p-4 align-top">
                      <button 
                        onClick={() => toggleStatus(supplier.id, supplier.isActive)}
                        disabled={user?.role === 'CASHIER'}
                        className={cn("px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none transition",
                          supplier.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100" 
                                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
                          user?.role === 'CASHIER' && "pointer-events-none opacity-80"
                        )}
                      >
                        {supplier.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    {user?.role !== 'CASHIER' && (
                      <td className="p-4 text-right pr-6 align-top">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenModal(supplier)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          {/* Note: Delete logic typically involves complex foreign key checks (cannot delete if POs exist). Soft delete / inactive is safer, so we omit hard trash unless strictly needed. */}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Overlay via tailwind fixed w/ inline implementation for simplicity */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <h3 className="text-lg font-bold text-slate-900">{editId ? 'Edit Supplier' : 'New Supplier'}</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><Plus size={24} className="rotate-45" /></button>
             </div>
             
             <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Company Name *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-slate-800" placeholder="e.g. FreshFarms Distributor" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-slate-800" placeholder="contact@supplier.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-slate-800" placeholder="+1 555-0000" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Business Address</label>
                  <textarea rows={3} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm text-slate-800 resize-none" placeholder="123 Warehouse Row..." />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition">Cancel</button>
                  <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition disabled:opacity-70 shadow-sm shadow-indigo-600/20">
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {saving ? 'Saving...' : 'Save Supplier'}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
