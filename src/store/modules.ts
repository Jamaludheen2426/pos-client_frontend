'use client';

import { useAuthStore } from './auth';

export function useModuleEnabled(module: string): boolean {
  const company = useAuthStore((s) => s.company);
  if (!company?.settings) return false;
  const settings = company.settings as unknown as Record<string, unknown>;
  return !!settings[module];
}

export function useModules() {
  const company = useAuthStore((s) => s.company);
  return company?.settings ?? null;
}
