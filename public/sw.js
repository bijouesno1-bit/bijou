// Service worker BIJOU : met en cache UNIQUEMENT la coquille de l'application
// (page, scripts, icônes). Les requêtes vers d'autres domaines (Firebase, Firestore)
// ne sont jamais interceptées : aucun billet ne peut être présenté comme validé sans le serveur.
// Changer VERSION quand la liste SHELL change. Les fichiers /assets/ ont un nom à empreinte.
const VERSION = 'bijou-shell-v1'
const SHELL = [
  './',
  'manifest.webmanifest',
  'favicon.ico',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'brand/logo-sombre.svg',
  'brand/logo-clair.svg',
]
const scope = self.registration.scope
const abs = p => new URL(p, scope).toString()

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL.map(abs)))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('bijou-shell-') && k !== VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (!req.url.startsWith(scope)) return
  if (req.mode === 'navigate') {
    e.respondWith(networkFirst(req, abs('./')))
    return
  }
  if (url.pathname.includes('/assets/')) {
    e.respondWith(cacheFirst(req))
    return
  }
  e.respondWith(networkFirst(req, null))
})

async function networkFirst(req, key) {
  const cache = await caches.open(VERSION)
  try {
    const res = await fetch(req)
    if (res && res.ok) cache.put(key || req, res.clone())
    return res
  } catch {
    const hit = await cache.match(key || req)
    if (hit) return hit
    return new Response('Hors connexion', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(VERSION)
  const hit = await cache.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res && res.ok) cache.put(req, res.clone())
  return res
}
