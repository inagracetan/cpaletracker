/**
 * CPALE Tracker Service Worker
 *
 * Strategy (chosen to avoid blank screens after deploys):
 * - HTML / navigations: network-first, cache fallback
 * - Hashed Expo bundles (/_expo/...): network-first (never serve a stale hash mismatch)
 * - Static shell icons/manifest: cache-first after first fetch
 * - Study / tracker user data is NEVER cached here.
 *   Records live only in IndexedDB / localStorage via StorageEngine and exist
 *   only after an explicit user import (or in-app edits). Reset clears those stores.
 */

const CACHE_VERSION = 'cpale-tracker-v6';
const SHELL_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.png',
  '/logo192.png',
  '/logo512.png',
  '/apple-touch-icon.png',
  '/cpabg.png',
  '/cpadark.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      await Promise.all(
        SHELL_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (response && response.ok) {
              await cache.put(url, response.clone());
            }
          } catch (err) {
            console.warn('[CPALE SW] precache miss', url, err);
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('cpale-tracker-') && key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        client.postMessage({ type: 'SW_ACTIVATED', cacheVersion: CACHE_VERSION });
      }
    })()
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data.type === 'CLEAR_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});

function isNavigationRequest(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' &&
      request.headers.get('accept') &&
      request.headers.get('accept').includes('text/html'))
  );
}

function isHashedBundle(url) {
  return (
    url.pathname.startsWith('/_expo/') ||
    /\.[a-f0-9]{8,}\.(js|css)$/i.test(url.pathname)
  );
}

async function networkFirst(request, fallbackUrls) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone()).catch(() => {});
      if (request.mode === 'navigate') {
        cache.put('/', networkResponse.clone()).catch(() => {});
      }
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    for (const url of fallbackUrls || []) {
      const hit = await cache.match(url);
      if (hit) return hit;
    }
    return new Response(
      '<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px"><h1>Offline</h1><p>CPALE Tracker could not load. Reconnect and hard-refresh once (Ctrl+Shift+R) to finish updating.</p></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

async function cacheFirstShell(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch {
    return (await cache.match('/offline.html')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;
  if (url.origin !== self.location.origin) return;

  // Always prefer network for HTML and hashed bundles so deploys cannot leave
  // users on an index.html that references deleted JS files.
  if (isNavigationRequest(request) || isHashedBundle(url)) {
    event.respondWith(networkFirst(request, ['/', '/index.html', '/offline.html']));
    return;
  }

  event.respondWith(cacheFirstShell(request));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        const client = clientList[0];
        if (client.focus) return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
