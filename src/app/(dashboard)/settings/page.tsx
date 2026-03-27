'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  User, Lock, Store, Loader2, Percent, Tag,
  Plus, Edit3, Trash2, X, Check,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TaxRate {
  id: number;
  name: string;
  rate: number;
  isDefault: boolean;
}

interface DiscountRule {
  id: number;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrderAmt: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
}

type Tab = 'profile' | 'password' | 'tax' | 'discounts';

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const { user, company } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // ── Profile ──
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Password ──
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  // ── Tax Rates ──
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loadingTax, setLoadingTax] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxRate | null>(null);
  const [taxForm, setTaxForm] = useState({ name: '', rate: '', isDefault: false });
  const [savingTax, setSavingTax] = useState(false);

  // ── Discount Rules ──
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountRule | null>(null);
  const [discountForm, setDiscountForm] = useState({
    code: '', type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED', value: '',
    minOrderAmt: '', maxUses: '', expiresAt: '',
  });
  const [savingDiscount, setSavingDiscount] = useState(false);

  /* ── Loaders ── */

  const fetchTaxRates = useCallback(() => {
    setLoadingTax(true);
    api.get('/tax-rates')
      .then((r) => setTaxRates(r.data))
      .catch(() => toast.error('Failed to load tax rates'))
      .finally(() => setLoadingTax(false));
  }, []);

  const fetchDiscounts = useCallback(() => {
    setLoadingDiscounts(true);
    api.get('/discount-rules')
      .then((r) => setDiscountRules(r.data))
      .catch(() => toast.error('Failed to load discount rules'))
      .finally(() => setLoadingDiscounts(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'tax') fetchTaxRates();
    if (activeTab === 'discounts') fetchDiscounts();
  }, [activeTab, fetchTaxRates, fetchDiscounts]);

  /* ── Profile handlers ── */

  const handleProfileSave = async () => {
    if (!name) { toast.error('Name is required'); return; }
    setSavingProfile(true);
    try {
      await api.patch(`/users/${user?.id}`, { name, email });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!newPw || newPw.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    setSavingPw(true);
    try {
      await api.patch(`/users/${user?.id}`, { password: newPw });
      toast.success('Password changed');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch {
      toast.error('Failed to change password');
    } finally {
      setSavingPw(false);
    }
  };

  /* ── Tax handlers ── */

  const openTaxCreate = () => {
    setEditingTax(null);
    setTaxForm({ name: '', rate: '', isDefault: false });
    setShowTaxModal(true);
  };

  const openTaxEdit = (t: TaxRate) => {
    setEditingTax(t);
    setTaxForm({ name: t.name, rate: String(t.rate), isDefault: t.isDefault });
    setShowTaxModal(true);
  };

  const handleTaxSave = async () => {
    if (!taxForm.name || !taxForm.rate) { toast.error('Name and rate are required'); return; }
    setSavingTax(true);
    try {
      const payload = { name: taxForm.name, rate: Number(taxForm.rate), isDefault: taxForm.isDefault };
      if (editingTax) {
        await api.patch(`/tax-rates/${editingTax.id}`, payload);
        toast.success('Tax rate updated');
      } else {
        await api.post('/tax-rates', payload);
        toast.success('Tax rate created');
      }
      setShowTaxModal(false);
      fetchTaxRates();
    } catch {
      toast.error('Failed to save tax rate');
    } finally {
      setSavingTax(false);
    }
  };

  const handleTaxDelete = async (id: number) => {
    if (!confirm('Delete this tax rate?')) return;
    try {
      await api.delete(`/tax-rates/${id}`);
      toast.success('Tax rate deleted');
      fetchTaxRates();
    } catch {
      toast.error('Failed to delete tax rate');
    }
  };

  /* ── Discount handlers ── */

  const openDiscountCreate = () => {
    setEditingDiscount(null);
    setDiscountForm({ code: '', type: 'PERCENTAGE', value: '', minOrderAmt: '', maxUses: '', expiresAt: '' });
    setShowDiscountModal(true);
  };

  const openDiscountEdit = (d: DiscountRule) => {
    setEditingDiscount(d);
    setDiscountForm({
      code: d.code,
      type: d.type,
      value: String(d.value),
      minOrderAmt: d.minOrderAmt ? String(d.minOrderAmt) : '',
      maxUses: d.maxUses ? String(d.maxUses) : '',
      expiresAt: d.expiresAt ? d.expiresAt.split('T')[0] : '',
    });
    setShowDiscountModal(true);
  };

  const handleDiscountSave = async () => {
    if (!discountForm.code || !discountForm.value) { toast.error('Code and value are required'); return; }
    setSavingDiscount(true);
    try {
      const payload = {
        code: discountForm.code,
        type: discountForm.type,
        value: Number(discountForm.value),
        minOrderAmt: discountForm.minOrderAmt ? Number(discountForm.minOrderAmt) : null,
        maxUses: discountForm.maxUses ? Number(discountForm.maxUses) : null,
        expiresAt: discountForm.expiresAt || null,
      };
      if (editingDiscount) {
        await api.patch(`/discount-rules/${editingDiscount.id}`, payload);
        toast.success('Discount rule updated');
      } else {
        await api.post('/discount-rules', payload);
        toast.success('Discount rule created');
      }
      setShowDiscountModal(false);
      fetchDiscounts();
    } catch {
      toast.error('Failed to save discount rule');
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleDiscountDelete = async (id: number) => {
    if (!confirm('Deactivate this discount rule?')) return;
    try {
      await api.delete(`/discount-rules/${id}`);
      toast.success('Discount rule deactivated');
      fetchDiscounts();
    } catch {
      toast.error('Failed to delete discount rule');
    }
  };

  /* ── Tabs config ── */

  const tabs = [
    { key: 'profile' as const, label: 'Profile', icon: User },
    { key: 'password' as const, label: 'Password', icon: Lock },
    { key: 'tax' as const, label: 'Tax Rates', icon: Percent },
    { key: 'discounts' as const, label: 'Discounts', icon: Tag },
  ];

  const inputClass = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account, tax rates, and discounts</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-56 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition',
                activeTab === tab.key ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">

          {/* ── Profile Tab ── */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-5">Profile Information</h3>
              <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                <Store size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{company?.name}</p>
                  <p className="text-xs text-gray-400">Your organization</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input value={user?.role || ''} disabled className="w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-sm text-gray-500" />
                </div>
              </div>
              <button onClick={handleProfileSave} disabled={savingProfile}
                className="mt-5 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition disabled:opacity-50">
                {savingProfile && <Loader2 size={14} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          )}

          {/* ── Password Tab ── */}
          {activeTab === 'password' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-5">Change Password</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className={inputClass} />
                </div>
              </div>
              <button onClick={handlePasswordSave} disabled={savingPw}
                className="mt-5 bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition disabled:opacity-50">
                {savingPw && <Loader2 size={14} className="animate-spin" />}
                Change Password
              </button>
            </div>
          )}

          {/* ── Tax Rates Tab ── */}
          {activeTab === 'tax' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div>
                  <h3 className="font-semibold text-gray-900">Tax Rates</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Manage tax rates applied to products</p>
                </div>
                <button onClick={openTaxCreate}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition">
                  <Plus size={14} /> Add Tax Rate
                </button>
              </div>

              {loadingTax ? (
                <div className="p-10 text-center text-gray-400">Loading...</div>
              ) : taxRates.length === 0 ? (
                <div className="p-10 text-center text-gray-400">No tax rates configured yet</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Name</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Rate (%)</th>
                      <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Default</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {taxRates.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-sm font-medium text-gray-900">{t.name}</td>
                        <td className="px-5 py-3 text-sm text-gray-600 text-right">{Number(t.rate).toFixed(2)}%</td>
                        <td className="px-5 py-3 text-center">
                          {t.isDefault && <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600"><Check size={12} /> Default</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openTaxEdit(t)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-500"><Edit3 size={14} /></button>
                            <button onClick={() => handleTaxDelete(t.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── Discounts Tab ── */}
          {activeTab === 'discounts' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <div>
                  <h3 className="font-semibold text-gray-900">Discount Rules</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Create discount codes for the POS</p>
                </div>
                <button onClick={openDiscountCreate}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition">
                  <Plus size={14} /> Add Discount
                </button>
              </div>

              {loadingDiscounts ? (
                <div className="p-10 text-center text-gray-400">Loading...</div>
              ) : discountRules.length === 0 ? (
                <div className="p-10 text-center text-gray-400">No discount rules yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Code</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Type</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Value</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Uses</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Expires</th>
                        <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                        <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {discountRules.map((d) => {
                        const expired = d.expiresAt && new Date(d.expiresAt) < new Date();
                        const maxedOut = d.maxUses && d.usedCount >= d.maxUses;
                        return (
                          <tr key={d.id} className="hover:bg-gray-50/50">
                            <td className="px-5 py-3 text-sm font-mono font-medium text-gray-900">{d.code}</td>
                            <td className="px-5 py-3 text-sm text-gray-600">{d.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}</td>
                            <td className="px-5 py-3 text-sm text-gray-900 text-right font-medium">
                              {d.type === 'PERCENTAGE' ? `${Number(d.value)}%` : `$${Number(d.value).toFixed(2)}`}
                            </td>
                            <td className="px-5 py-3 text-sm text-gray-600 text-right">
                              {d.usedCount}{d.maxUses ? ` / ${d.maxUses}` : ''}
                            </td>
                            <td className="px-5 py-3 text-sm text-gray-600">
                              {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="px-5 py-3 text-center">
                              {!d.isActive ? (
                                <span className="badge badge-danger">Inactive</span>
                              ) : expired ? (
                                <span className="badge badge-warning">Expired</span>
                              ) : maxedOut ? (
                                <span className="badge badge-warning">Maxed Out</span>
                              ) : (
                                <span className="badge badge-success">Active</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => openDiscountEdit(d)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-500"><Edit3 size={14} /></button>
                                {d.isActive && <button onClick={() => handleDiscountDelete(d.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Tax Rate Modal ── */}
      {showTaxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{editingTax ? 'Edit Tax Rate' : 'Add Tax Rate'}</h3>
              <button onClick={() => setShowTaxModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input value={taxForm.name} onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
                  placeholder="e.g. GST, VAT" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate (%) *</label>
                <input type="number" step="0.01" value={taxForm.rate} onChange={(e) => setTaxForm({ ...taxForm, rate: e.target.value })}
                  placeholder="e.g. 18" className={inputClass} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={taxForm.isDefault} onChange={(e) => setTaxForm({ ...taxForm, isDefault: e.target.checked })}
                  className="rounded border-gray-300" />
                <span className="text-gray-700">Set as default tax rate</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowTaxModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={handleTaxSave} disabled={savingTax}
                className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
                {savingTax && <Loader2 size={14} className="animate-spin" />}
                {editingTax ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Discount Rule Modal ── */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{editingDiscount ? 'Edit Discount' : 'Add Discount'}</h3>
              <button onClick={() => setShowDiscountModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Code *</label>
                  <input value={discountForm.code} onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SAVE10" className={cn(inputClass, 'font-mono uppercase')} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select value={discountForm.type} onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value as 'PERCENTAGE' | 'FIXED' })}
                    className={inputClass}>
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
                  <input type="number" step="0.01" value={discountForm.value}
                    onChange={(e) => setDiscountForm({ ...discountForm, value: e.target.value })}
                    placeholder={discountForm.type === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 5.00'} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount</label>
                  <input type="number" step="0.01" value={discountForm.minOrderAmt}
                    onChange={(e) => setDiscountForm({ ...discountForm, minOrderAmt: e.target.value })}
                    placeholder="Optional" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
                  <input type="number" value={discountForm.maxUses}
                    onChange={(e) => setDiscountForm({ ...discountForm, maxUses: e.target.value })}
                    placeholder="Unlimited" className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input type="date" value={discountForm.expiresAt}
                    onChange={(e) => setDiscountForm({ ...discountForm, expiresAt: e.target.value })}
                    className={inputClass} />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowDiscountModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={handleDiscountSave} disabled={savingDiscount}
                className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
                {savingDiscount && <Loader2 size={14} className="animate-spin" />}
                {editingDiscount ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
