'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { User, Lock, Loader2, Shield } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

type Tab = 'profile' | 'password';
const inp = 'w-full border border-[#C9CCCF] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008060]/30 focus:border-[#008060] transition-colors text-[#202223]';

export default function SettingsPage() {
  const { user, company } = useAuthStore();
  const [tab, setTab] = useState<Tab>('profile');

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    try { await api.patch(`/users/${user?.id}`, { name, email }); toast.success('Profile updated'); }
    catch { toast.error('Failed to update profile'); } finally { setSavingProfile(false); }
  };

  const savePassword = async () => {
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return; }
    if (newPw.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSavingPw(true);
    try { await api.patch(`/users/${user?.id}`, { currentPassword: currentPw, password: newPw }); toast.success('Password changed'); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }
    catch { toast.error('Failed to change password'); } finally { setSavingPw(false); }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
  ];

  return (
    <div className="p-6 max-w-2xl" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#202223]">Settings</h1>
        <p className="text-sm text-[#6D7175] mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Company info card */}
      <div className="bg-white rounded-xl border border-[#E1E3E5] p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#EAF5F0] text-[#008060] rounded-xl flex items-center justify-center font-bold text-lg">
            {(company?.name || 'P').charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-[#202223]">{company?.name || 'Your Company'}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Shield size={12} className="text-[#008060]" />
              <p className="text-xs text-[#6D7175]">{user?.role} · {user?.store?.name || 'All stores'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 p-1 bg-[#F6F6F7] rounded-lg border border-[#E1E3E5] mb-5 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors', tab === id ? 'bg-white shadow-sm text-[#202223]' : 'text-[#6D7175] hover:text-[#202223]')}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="bg-white rounded-xl border border-[#E1E3E5] p-6 space-y-5">
          <h2 className="text-sm font-semibold text-[#202223]">Personal information</h2>
          <div>
            <label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Email address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inp} />
          </div>
          <div className="pt-2 flex justify-end">
            <button onClick={saveProfile} disabled={savingProfile} className="flex items-center gap-2 bg-[#008060] hover:bg-[#006E52] text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
              {savingProfile && <Loader2 size={14} className="animate-spin" />}Save changes
            </button>
          </div>
        </div>
      )}

      {tab === 'password' && (
        <div className="bg-white rounded-xl border border-[#E1E3E5] p-6 space-y-5">
          <h2 className="text-sm font-semibold text-[#202223]">Change password</h2>
          <div>
            <label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Current password</label>
            <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">New password</label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6D7175] mb-1.5 uppercase tracking-wide">Confirm new password</label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className={inp} />
          </div>
          <div className="pt-2 flex justify-end">
            <button onClick={savePassword} disabled={savingPw} className="flex items-center gap-2 bg-[#008060] hover:bg-[#006E52] text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
              {savingPw && <Loader2 size={14} className="animate-spin" />}Update password
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
