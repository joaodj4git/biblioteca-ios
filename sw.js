// Guarda o app para abrir mesmo sem internet. Os dados vêm sempre do servidor.
const CACHE = 'sua-estante-v2';
const ARQUIVOS = ['./', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'icons/icone-180.png', 'icons/icone-192.png', 'icons/icone-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // rede primeiro (para pegar atualizações), cache se estiver sem internet
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
