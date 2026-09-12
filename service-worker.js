/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'intuition-training-cache';

const SHELL_URLS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './logo192.png',
  './logo512.png',
  './asset-manifest.json',
  './cards/back.svg',
];

const CARD_FILES = [
  '6_c','6_d','6_h','6_s',
  '7_c','7_d','7_h','7_s',
  '8_c','8_d','8_h','8_s',
  '9_c','9_d','9_h','9_s',
  '10_c','10_d','10_h','10_s',
  'j_c','j_d','j_h','j_s',
  'q_c','q_d','q_h','q_s',
  'k_c','k_d','k_h','k_s',
  'a_c','a_d','a_h','a_s',
].map((name) => `./cards/${name}.svg`);

function normalizeUrl(path) {
  if (!path) {
    return null;
  }
  if (path.startsWith('./')) {
    return path;
  }
  if (path.startsWith('/')) {
    return '.' + path;
  }
  return './' + path;
}

function getUrlsFromManifest(manifest) {
  const urls = new Set([...SHELL_URLS, ...CARD_FILES]);

  manifest.entrypoints.forEach((entry) => {
    const url = normalizeUrl(entry);
    if (url) {
      urls.add(url);
    }
  });

  Object.values(manifest.files).forEach((file) => {
    const url = normalizeUrl(file);
    if (url) {
      urls.add(url);
    }
  });

  return Array.from(urls);
}

async function precacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.warn('[SW] Failed to precache:', url, error);
      }
    })
  );

  const keys = await cache.keys();
  const allowed = new Set(urls.map((url) => new URL(url, self.location).href));

  await Promise.all(
    keys.map(async (request) => {
      if (!allowed.has(request.url)) {
        await cache.delete(request);
      }
    })
  );
}

async function putInCache(request, response) {
  if (!response.ok) {
    return;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response);
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await putInCache(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    if (request.mode === 'navigate') {
      const cachedIndex = await caches.match('./index.html');
      if (cachedIndex) {
        return cachedIndex;
      }
    }

    throw error;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const manifestResponse = await fetch('./asset-manifest.json', { cache: 'no-cache' });
      const manifest = await manifestResponse.json();
      const urls = getUrlsFromManifest(manifest);

      await precacheUrls(urls);
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
          .filter((key) => key.startsWith('intuition-training-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(networkFirst(event.request));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
