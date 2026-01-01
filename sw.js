
const CACHE_NAME = 'ppb-miniserver-v21';
const EXTERNAL_LIBS = [
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://esm.sh/react@^19.2.3',
  'https://esm.sh/react-dom@^19.2.3/',
  'https://esm.sh/@google/genai@^1.34.0',
  'https://esm.sh/recharts@^3.6.0',
  'https://esm.sh/pptxgenjs@3.12.0',
  'https://esm.sh/html-to-image@1.11.11'
];

const INTERNAL_ASSETS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Tentiamo di pre-caricare tutto il necessario
      return cache.addAll([...INTERNAL_ASSETS, ...EXTERNAL_LIBS]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Strategia: Cache First per garantire velocità e funzionamento offline
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Se scarichiamo qualcosa di nuovo (es. una nuova libreria da esm.sh), la mettiamo in cache
        if (!response || response.status !== 200 || response.type !== 'basic' && !event.request.url.includes('esm.sh')) {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
