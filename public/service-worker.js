/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'intuition-training-cache';

// Mobile carriers sometimes blackhole update requests instead of failing them.
// The update runs once at app startup and is abandoned after this delay.
// Page requests never wait on the network: they are served from this cache.
const UPDATE_TIMEOUT_MS = 12000;

const SHELL_URLS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './favicon-32.png',
  './logo192.png',
  './logo512.png',
  './asset-manifest.json',
  './cards/back.svg',
  './cards/number-back.svg',
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

function isCacheable(url, response) {
  if (!response.ok) {
    return false;
  }

  const path = url.split('?')[0];
  if (!path.endsWith('.svg')) {
    return true;
  }

  const type = (response.headers.get('content-type') || '').toLowerCase();
  if (!type) {
    return true;
  }

  // A captive portal often answers 200 text/html. Never store that over a card.
  return type.includes('svg') || type.includes('xml');
}

async function precacheUrls(urls, signal) {
  const entries = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'no-cache', signal });
        if (!isCacheable(url, response)) {
          console.warn('[SW] Failed to precache:', url, response.status);
          return null;
        }
        return { url, response };
      } catch (error) {
        if (signal.aborted) {
          throw error;
        }
        console.warn('[SW] Failed to precache:', url, error);
        return null;
      }
    })
  );

  if (signal.aborted) {
    throw new DOMException('Update timed out', 'AbortError');
  }

  const cache = await caches.open(CACHE_NAME);

  await Promise.all(
    entries
      .filter(Boolean)
      .map((entry) => cache.put(entry.url, entry.response))
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

async function fetchAndPrecache(signal) {
  const manifestResponse = await fetch('./asset-manifest.json', {
    cache: 'no-cache',
    signal,
  });
  if (!manifestResponse.ok) {
    throw new Error('[SW] asset-manifest.json request failed: ' + manifestResponse.status);
  }

  const manifest = await manifestResponse.json();
  const urls = getUrlsFromManifest(manifest);
  await precacheUrls(urls, signal);
}

let updateInFlight = null;

function startupUpdate() {
  if (updateInFlight) {
    return updateInFlight;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPDATE_TIMEOUT_MS);

  updateInFlight = fetchAndPrecache(controller.signal).catch((error) => {
    console.warn('[SW] Update stopped, keeping cached version:', error);
  }).finally(() => {
    clearTimeout(timer);
    updateInFlight = null;
  });

  return updateInFlight;
}

async function fromCache(request) {
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

  return new Response('', { status: 504, statusText: 'Not in cache' });
}

self.addEventListener('install', (event) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPDATE_TIMEOUT_MS);

  event.waitUntil(
    (async () => {
      try {
        await fetchAndPrecache(controller.signal);
        await self.skipWaiting();
      } catch (error) {
        console.warn('[SW] Update stopped, launching cached version:', error);
        throw error;
      } finally {
        clearTimeout(timer);
      }
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

  event.respondWith(fromCache(event.request));
});

self.addEventListener('message', (event) => {
  if (!event.data) {
    return;
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'STARTUP_UPDATE') {
    event.waitUntil(startupUpdate());
  }
});
