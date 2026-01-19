// Service Worker for offline capability and caching
// Provides fallback data when network is unavailable

const CACHE_NAME = 'wecare-admin-v1';
const API_CACHE_NAME = 'wecare-api-v1';

// Resources to cache immediately
const STATIC_CACHE_URLS = [
  '/admin-app',
  '/admin-app/_components/SalesOrderForm',
  '/admin-app/_components/ProductEntryForm',
  // Add critical CSS/JS files
];

// API endpoints to cache for offline use
const API_CACHE_PATTERNS = [
  /\/api\/admin-app\/products/,
  /\/api\/admin-app\/customers/,
  /\/api\/admin-app\/warehouses/,
  /\/api\/admin-app\/units/,
];

// Install event - cache static resources
self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
  // Force activation
  (self as any).skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control immediately
  (self as any).clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event: any) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Handle API requests
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        try {
          // Try network first
          const networkResponse = await fetch(request);
          // Cache successful responses
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // Network failed, try cache
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline fallback
          return new Response(
            JSON.stringify({
              error: 'Offline mode',
              message: 'Data may be outdated. Please check connection.'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      })
    );
    return;
  }

  // Handle static resources
  event.respondWith(
    caches.match(request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(request);
    })
  );
});

// Background sync for failed requests
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'background-sync-orders') {
    event.waitUntil(syncPendingOrders());
  }
});

async function syncPendingOrders() {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const keys = await cache.keys();

    // Find pending order requests
    const orderRequests = keys.filter(request =>
      request.url.includes('/api/admin-app/save-sale-order-details') ||
      request.url.includes('/api/admin-app/save-sobg-details')
    );

    // Retry each pending request
    for (const request of orderRequests) {
      try {
        await fetch(request);
        await cache.delete(request); // Remove from cache on success
      } catch (error) {
        console.error('Failed to sync order:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Message handler for communication with main thread
self.addEventListener('message', (event: any) => {
  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      (self as any).skipWaiting();
      break;

    case 'GET_CACHE_STATS':
      getCacheStats().then(stats => {
        event.ports[0].postMessage({ type: 'CACHE_STATS', data: stats });
      });
      break;

    case 'CLEAR_CACHE':
      clearAllCache();
      break;
  }
});

async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats: any = {};

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = {
      entries: keys.length,
      urls: keys.map(request => request.url)
    };
  }

  return stats;
}

async function clearAllCache() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}
