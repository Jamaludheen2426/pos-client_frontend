import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface POSSchema extends DBSchema {
  products: {
    key: number;
    value: {
      id: number;
      name: string;
      barcode: string | null;
      basePrice: number;
      category: string | null;
      variants: unknown[];
    };
    indexes: { by_barcode: string };
  };
  pendingSales: {
    key: string;
    value: {
      receiptNo: string;
      items: unknown[];
      payments: unknown[];
      total: number;
      createdAt: string;
      synced: boolean;
    };
  };
  offlineMeta: {
    key: string;
    value: { key: string; value: unknown };
  };
}

let db: IDBPDatabase<POSSchema>;

export const getDB = async () => {
  if (db) return db;
  db = await openDB<POSSchema>('pos-offline', 1, {
    upgrade(database) {
      const productStore = database.createObjectStore('products', { keyPath: 'id' });
      productStore.createIndex('by_barcode', 'barcode');

      database.createObjectStore('pendingSales', { keyPath: 'receiptNo' });
      database.createObjectStore('offlineMeta', { keyPath: 'key' });
    },
  });
  return db;
};

export const saveProductsOffline = async (products: POSSchema['products']['value'][]) => {
  const database = await getDB();
  const tx = database.transaction('products', 'readwrite');
  await Promise.all(products.map((p) => tx.store.put(p)));
  await tx.done;
};

export const getProductByBarcode = async (barcode: string) => {
  const database = await getDB();
  return database.getFromIndex('products', 'by_barcode', barcode);
};

export const savePendingSale = async (sale: POSSchema['pendingSales']['value']) => {
  const database = await getDB();
  await database.put('pendingSales', sale);
};

export const getPendingSales = async () => {
  const database = await getDB();
  return database.getAll('pendingSales');
};

export const markSaleSynced = async (receiptNo: string) => {
  const database = await getDB();
  const sale = await database.get('pendingSales', receiptNo);
  if (sale) await database.put('pendingSales', { ...sale, synced: true });
};
