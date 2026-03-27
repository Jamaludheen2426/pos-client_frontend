'use client';

import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  companyId: number;
  storeId: number;
  store?: { id: number; name: string };
}

interface CompanySettings {
  logoUrl: string | null;
  primaryColor: string | null;
  offlineMode: boolean;
  offlineAllowedDays: number;
  hasInventory: boolean;
  hasCustomers: boolean;
  hasLoyalty: boolean;
  hasDiscount: boolean;
  hasPurchaseOrders: boolean;
  hasReports: boolean;
  hasMultiStore: boolean;
  hasTax: boolean;
  hasBarcode: boolean;
  hasExpiry: boolean;
  hasStaffManagement: boolean;
  hasVariants: boolean;
}

interface AuthState {
  user: User | null;
  company: { id: number; name: string; settings: CompanySettings | null } | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  company: null,
  loading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password, platform: 'web' });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user, company: data.company, loading: false });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, company: null });
    window.location.href = '/login';
  },

  loadUser: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { set({ loading: false }); return; }
    try {
      const { data } = await api.get('/auth/me');
      const u = data.user || data;
      set({ user: u, company: data.company || null, loading: false });
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, company: null, loading: false });
    }
  },
}));
