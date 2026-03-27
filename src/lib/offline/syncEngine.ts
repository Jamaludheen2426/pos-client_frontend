import api from '../api';
import { getPendingSales, markSaleSynced } from './db';

export const syncPendingSales = async (): Promise<{ synced: number; failed: number }> => {
  const pending = await getPendingSales();
  const unsynced = pending.filter((s) => !s.synced);

  let synced = 0;
  let failed = 0;

  for (const sale of unsynced) {
    try {
      await api.post('/sales', sale);
      await markSaleSynced(sale.receiptNo);
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
};

// Auto-sync when browser comes back online
export const initAutoSync = () => {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', async () => {
    const result = await syncPendingSales();
    console.log(`[Sync] ${result.synced} sales synced, ${result.failed} failed`);
  });
};
