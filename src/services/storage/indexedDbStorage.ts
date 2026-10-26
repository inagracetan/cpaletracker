/**
 * IndexedDB Storage Engine for CPALE Tracker
 * Provides resilient, high-capacity, structured offline persistence.
 */

const DB_NAME = 'cpale_tracker_db';
const DB_VERSION = 1;

export const STORES = {
  APP_STATE: 'app_state',
  REMINDERS: 'reminders',
  OFFLINE_QUEUE: 'offline_queue',
} as const;

export class IndexedDbStorage {
  private static dbPromise: Promise<IDBDatabase | null> | null = null;

  private static isAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  }

  private static async getDb(): Promise<IDBDatabase | null> {
    if (!this.isAvailable()) return null;
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORES.APP_STATE)) {
            db.createObjectStore(STORES.APP_STATE);
          }
          if (!db.objectStoreNames.contains(STORES.REMINDERS)) {
            db.createObjectStore(STORES.REMINDERS, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORES.OFFLINE_QUEUE)) {
            db.createObjectStore(STORES.OFFLINE_QUEUE, { keyPath: 'id', autoIncrement: true });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = (e) => {
          console.warn('IndexedDB failed to open, falling back to local storage:', e);
          resolve(null);
        };

        request.onblocked = () => {
          console.warn('IndexedDB blocked by open connection elsewhere');
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB error during initialization:', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  public static async setItem<T>(storeName: string, key: string, value: T): Promise<boolean> {
    try {
      const db = await this.getDb();
      if (!db) return false;

      return new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(value, key);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn(`IndexedDbStorage.setItem failed for [${storeName}/${key}]:`, e);
      return false;
    }
  }

  public static async getItem<T>(storeName: string, key: string): Promise<T | null> {
    try {
      const db = await this.getDb();
      if (!db) return null;

      return new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);

        req.onsuccess = () => {
          resolve(req.result !== undefined ? req.result : null);
        };
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      console.warn(`IndexedDbStorage.getItem failed for [${storeName}/${key}]:`, e);
      return null;
    }
  }

  public static async removeItem(storeName: string, key: string): Promise<boolean> {
    try {
      const db = await this.getDb();
      if (!db) return false;

      return new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn(`IndexedDbStorage.removeItem failed for [${storeName}/${key}]:`, e);
      return false;
    }
  }

  public static async getAll<T>(storeName: string): Promise<T[]> {
    try {
      const db = await this.getDb();
      if (!db) return [];

      return new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch (e) {
      console.warn(`IndexedDbStorage.getAll failed for [${storeName}]:`, e);
      return [];
    }
  }

  public static async clearStore(storeName: string): Promise<boolean> {
    try {
      const db = await this.getDb();
      if (!db) return false;

      return new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn(`IndexedDbStorage.clearStore failed for [${storeName}]:`, e);
      return false;
    }
  }

  /**
   * Permanently delete the entire CPALE IndexedDB database and reset the open handle.
   * Used by Reset so cleared tracker data cannot be read back from a stale connection.
   */
  public static async deleteDatabase(): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const existing = await this.getDb();
      if (existing) {
        try {
          existing.close();
        } catch {
          /* ignore */
        }
      }
      this.dbPromise = null;

      return await new Promise((resolve) => {
        const req = window.indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
        req.onblocked = () => {
          console.warn('IndexedDbStorage.deleteDatabase blocked; stores were cleared instead');
          resolve(false);
        };
      });
    } catch (e) {
      console.warn('IndexedDbStorage.deleteDatabase failed:', e);
      this.dbPromise = null;
      return false;
    }
  }
}
