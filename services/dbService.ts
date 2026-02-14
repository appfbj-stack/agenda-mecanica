
import { ServiceRecord, WorkshopSettings } from '../types';

const DB_NAME = 'OficinaPlusDB';
const DB_VERSION = 1;
const STORE_SERVICES = 'services';
const STORE_SETTINGS = 'settings';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_SERVICES)) {
          db.createObjectStore(STORE_SERVICES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }
      };
    } catch (e) {
      reject(e);
    }
  });
};

export const getServices = async (): Promise<ServiceRecord[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SERVICES, 'readonly');
    const store = transaction.objectStore(STORE_SERVICES);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = request.result as ServiceRecord[];
      resolve(results.sort((a, b) => b.createdAt - a.createdAt));
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveService = async (service: ServiceRecord): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SERVICES, 'readwrite');
    const store = transaction.objectStore(STORE_SERVICES);
    const request = store.put(service);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteService = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SERVICES, 'readwrite');
    const store = transaction.objectStore(STORE_SERVICES);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getSettings = async (): Promise<WorkshopSettings> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SETTINGS, 'readonly');
    const store = transaction.objectStore(STORE_SETTINGS);
    const request = store.get('workshop_config');
    request.onsuccess = () => {
      if (request.result) {
        const { key, ...settings } = request.result;
        resolve(settings);
      } else {
        resolve({
          name: 'Oficina+',
          phone: '(11) 99999-9999',
          address: 'Endereço da Oficina'
        });
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveSettings = async (settings: WorkshopSettings): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = transaction.objectStore(STORE_SETTINGS);
    const request = store.put({ key: 'workshop_config', ...settings });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const generateId = (): string => Math.random().toString(36).substr(2, 9);

export const calculateTotal = (service: ServiceRecord): number => {
  const partsTotal = service.parts.reduce((acc, part) => acc + (part.quantity * part.unitPrice), 0);
  return partsTotal + (Number(service.laborCost) || 0);
};
