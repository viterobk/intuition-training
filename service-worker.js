/* eslint-disable no-restricted-globals */

const LEGACY_CACHE = 'intuition-training-cache';
const META_CACHE = 'intuition-training-meta';
const ACTIVE_URL = './active-cache';

// Mobile carriers sometimes blackhole update requests instead of failing them.
// The update runs once at app startup and is abandoned after this delay.
// Downloads go into a separate cache under temporary names. The app keeps
// reading the current cache until every file has arrived and the caches are swapped.
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

function incomingUrl(url) {
  const absolute = new URL(url, self.location);
  absolute.searchParams.set('sw-incoming', '1');
  return absolute.href;
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

function isContentCache(name) {
  return name.startsWith('intuition-training-') && name !== META_CACHE;
}

let activeCacheNamePromise = null;

function rememberActiveCache(name) {
  activeCacheNamePromise = Promise.resolve(name);
}

async function readStoredCacheName() {
  const meta = await caches.open(META_CACHE);
  const stored = await meta.match(ACTIVE_URL);
  if (stored) {
    const name = (await stored.text()).trim();
    if (isContentCache(name)) {
      return name;
    }
  }

  const keys = await caches.keys();
  if (keys.includes(LEGACY_CACHE)) {
    return LEGACY_CACHE;
  }

  return null;
}

function readActiveCacheName() {
  if (!activeCacheNamePromise) {
    activeCacheNamePromise = readStoredCacheName();
  }
  return activeCacheNamePromise;
}

async function setActiveCacheName(name) {
  const meta = await caches.open(META_CACHE);
  await meta.put(ACTIVE_URL, new Response(name, {
    headers: { 'Content-Type': 'text/plain' },
  }));
  rememberActiveCache(name);
}

async function storeIncoming(staging, urls, signal) {
  let firstError = null;

  await Promise.all(urls.map(async (url) => {
    try {
      const response = await fetch(url, { cache: 'no-cache', signal });
      if (!isCacheable(url, response)) {
        throw new Error('[SW] Failed to precache: ' + url + ' ' + response.status);
      }
      if (firstError || signal.aborted) {
        return;
      }
      await staging.put(incomingUrl(url), response);
    } catch (error) {
      if (!firstError) {
        firstError = error;
      }
    }
  }));

  if (signal.aborted) {
    throw firstError || new DOMException('Update timed out', 'AbortError');
  }
  if (firstError) {
    throw firstError;
  }
}

async function publishIncoming(staging, urls) {
  for (const url of urls) {
    const staged = await staging.match(incomingUrl(url));
    if (!staged) {
      throw new Error('[SW] Incomplete update, not switching cache: ' + url);
    }
    await staging.put(url, staged);
  }

  await Promise.all(urls.map((url) => staging.delete(incomingUrl(url))));

  for (const url of urls) {
    const ready = await staging.match(url);
    if (!ready) {
      throw new Error('[SW] Incomplete update, not switching cache: ' + url);
    }
  }
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
  const current = await readStoredCacheName();
  const stagingName = 'intuition-training-incoming-'
    + Date.now().toString(36)
    + '-'
    + Math.random().toString(36).slice(2);
  const staging = await caches.open(stagingName);
  let committed = false;

  try {
    await storeIncoming(staging, urls, signal);
    await publishIncoming(staging, urls);

    const latest = await readStoredCacheName();
    if (latest !== current) {
      throw new Error('[SW] Update superseded');
    }

    await setActiveCacheName(stagingName);
    committed = true;

    // During install the previous worker is still serving the old cache.
    if (current && current !== stagingName && self.registration.active === self) {
      await caches.delete(current);
    }
  } finally {
    if (!committed) {
      await caches.delete(stagingName);
    }
  }
}

let updateInFlight = null;

function startUpdate() {
  if (updateInFlight) {
    return updateInFlight;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPDATE_TIMEOUT_MS);

  updateInFlight = fetchAndPrecache(controller.signal).finally(() => {
    clearTimeout(timer);
    updateInFlight = null;
  });

  return updateInFlight;
}

async function fromCache(request) {
  const cacheName = await readActiveCacheName();
  if (!cacheName) {
    return new Response('', { status: 504, statusText: 'Not in cache' });
  }

  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  if (request.mode === 'navigate') {
    const cachedIndex = await cache.match('./index.html');
    if (cachedIndex) {
      return cachedIndex;
    }
  }

  return new Response('', { status: 504, statusText: 'Not in cache' });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    startUpdate()
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.warn('[SW] Update stopped, launching cached version:', error);
        throw error;
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const active = await readActiveCacheName();
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => isContentCache(key) && key !== active)
          .map((key) => caches.delete(key))
      );
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
    event.waitUntil(startUpdate().catch((error) => {
      console.warn('[SW] Update stopped, keeping cached version:', error);
    }));
  }
});
