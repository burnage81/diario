/* Diario · Fase 1 — service worker
   - I DATI sono in localStorage, NON nella cache: aggiornare la cache non tocca lo storico.
   - Per pubblicare una nuova versione dell'app: cambia CACHE (es. v2) e ripubblica. */
const CACHE = 'diario-v2';
const ASSETS = [
  'index.html',
  'manifest.webmanifest',
  'icon.svg',
  'icon-maskable.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isAppShell = req.mode === 'navigate' || url.pathname.endsWith('index.html');

  if (isAppShell) {
    // network-first: app fresca quando c'è rete, cache quando si è offline (palestra)
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put('index.html', copy));
        return resp;
      }).catch(() => caches.match('index.html'))
    );
  } else {
    // cache-first per gli asset statici
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return resp;
      }).catch(() => undefined))
    );
  }
});
