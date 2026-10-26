/**
 * Offline & Connectivity Service
 * Monitors online/offline status, registers the PWA service worker,
 * tracks offline-shell readiness, and exposes install guidance.
 *
 * Study records persist via IndexedDB + localStorage (StorageEngine).
 * This service does NOT claim automatic cross-device sync unless Supabase is configured.
 */

export interface OfflineStatus {
  isOnline: boolean;
  hasServiceWorker: boolean;
  offlineReady: boolean;
  cacheVersion: string | null;
  lastSyncTime: number | null;
  pendingSyncCount: number;
  canInstall: boolean;
}

type ConnectivityListener = (isOnline: boolean) => void;
type StatusListener = (status: OfflineStatus) => void;

export class OfflineService {
  private static listeners: Set<ConnectivityListener> = new Set();
  private static statusListeners: Set<StatusListener> = new Set();
  private static registered: boolean = false;
  private static offlineReady: boolean = false;
  private static cacheVersion: string | null = null;
  private static deferredInstallPrompt: any = null;
  private static currentOnline: boolean =
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;

  /**
   * Register PWA Service Worker in supported web environments
   */
  public static async registerServiceWorker(): Promise<boolean> {
    if (this.registered) return true;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      this.registered = true;

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') {
            this.refreshOfflineReady().catch(() => {});
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.refreshOfflineReady().catch(() => {});
      });

      navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event.data || {};
        if (data.type === 'SW_ACTIVATED' || data.type === 'SW_VERSION') {
          this.cacheVersion = data.cacheVersion || this.cacheVersion;
          this.refreshOfflineReady().catch(() => {});
        }
      });

      await this.refreshOfflineReady();
      console.log('OfflineService: ServiceWorker registered with scope:', registration.scope);
      return true;
    } catch (error) {
      console.warn('OfflineService: ServiceWorker registration skipped or failed:', error);
      return false;
    }
  }

  /**
   * Initialize online/offline listeners, install prompt capture, and SW registration
   */
  public static initialize(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.currentOnline = true;
      this.notifyListeners(true);
      this.notifyStatusListeners();
      console.log('OfflineService: Network connection restored (Online)');
    });

    window.addEventListener('offline', () => {
      this.currentOnline = false;
      this.notifyListeners(false);
      this.notifyStatusListeners();
      console.log('OfflineService: Network connection lost (Offline)');
    });

    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredInstallPrompt = event;
      this.notifyStatusListeners();
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      this.notifyStatusListeners();
    });

    this.registerServiceWorker().catch(() => {});
    this.refreshOfflineReady().catch(() => {});
  }

  public static isOnline(): boolean {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return this.currentOnline;
  }

  public static isOfflineReady(): boolean {
    return this.offlineReady;
  }

  public static getStatus(): OfflineStatus {
    return {
      isOnline: this.isOnline(),
      hasServiceWorker:
        typeof navigator !== 'undefined' &&
        'serviceWorker' in navigator &&
        (!!navigator.serviceWorker.controller || this.registered),
      offlineReady: this.offlineReady,
      cacheVersion: this.cacheVersion,
      lastSyncTime: null,
      pendingSyncCount: 0,
      canInstall: !!this.deferredInstallPrompt,
    };
  }

  public static async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredInstallPrompt) return 'unavailable';
    try {
      this.deferredInstallPrompt.prompt();
      const choice = await this.deferredInstallPrompt.userChoice;
      this.deferredInstallPrompt = null;
      this.notifyStatusListeners();
      return choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
    } catch {
      return 'unavailable';
    }
  }

  public static addListener(listener: ConnectivityListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public static addStatusListener(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private static notifyListeners(isOnline: boolean): void {
    for (const listener of this.listeners) {
      try {
        listener(isOnline);
      } catch (e) {
        console.warn('OfflineService listener error:', e);
      }
    }
  }

  private static notifyStatusListeners(): void {
    const status = this.getStatus();
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch (e) {
        console.warn('OfflineService status listener error:', e);
      }
    }
  }

  /**
   * Mark offline shell ready when the SW controls the page and core caches exist.
   */
  private static async refreshOfflineReady(): Promise<void> {
    if (typeof window === 'undefined' || !('caches' in window)) {
      this.offlineReady = false;
      this.notifyStatusListeners();
      return;
    }

    try {
      const hasController =
        'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
      const keys = await caches.keys();
      const cpaleCaches = keys.filter((k) => k.startsWith('cpale-tracker-'));
      let hasShell = false;

      for (const key of cpaleCaches) {
        const cache = await caches.open(key);
        const shell = (await cache.match('/')) || (await cache.match('/index.html'));
        if (shell) {
          hasShell = true;
          this.cacheVersion = key;
          break;
        }
      }

      // On first visit the SW may be registered but not yet controlling; still treat
      // a successful shell precache as "setup complete" for the indicator.
      this.offlineReady = hasShell && (hasController || this.registered);
      this.notifyStatusListeners();
    } catch {
      this.offlineReady = false;
      this.notifyStatusListeners();
    }
  }

  /**
   * Transparent description of offline capabilities / limitations
   */
  public static getOfflineNotice(): string {
    return 'After the first successful online load, study tracking, syllabus checklists, assessments, plans, deadlines, progress, and local import/export work offline on this device. Data is stored in IndexedDB on this browser only and is not shared automatically across devices unless optional cloud sync is configured. Browsers may clear site data under storage pressure — use Settings → Export Backup regularly.';
  }

  public static getInstallInstructions(): {
    windows: string;
    macos: string;
    android: string;
    ios: string;
  } {
    return {
      windows:
        'In Chrome or Edge, open the site, then use the install icon in the address bar or Menu → Install CPALE Tracker / Apps → Install this site as an app.',
      macos:
        'In Chrome or Edge, use the install icon in the address bar. Safari supports Add to Dock on newer macOS versions via File → Add to Dock where available.',
      android:
        'Open the site in Chrome, tap the menu (⋮), then Install app or Add to Home screen.',
      ios:
        'Open the site in Safari, tap Share, then Add to Home Screen. Other iOS browsers may not support full PWA installation.',
    };
  }
}
