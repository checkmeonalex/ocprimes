const VERSION = 'alxora-pwa-v2'
const OFFLINE_PAGE = '/offline'
const CORE_CACHE = `${VERSION}-core`
const ASSET_CACHE = `${VERSION}-assets`

const CORE_ASSETS = [OFFLINE_PAGE, '/manifest.webmanifest', '/pwa-192.png', '/pwa-512.png', '/pwa-maskable-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CORE_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

const isStorefrontNavigation = (request, url) => {
  if (request.mode !== 'navigate') return false
  if (request.method !== 'GET') return false
  if (url.origin !== self.location.origin) return false
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/backend/admin') ||
    url.pathname.startsWith('/account') ||
    url.pathname.startsWith('/UserBackend') ||
    url.pathname.startsWith('/checkout') ||
    url.pathname.startsWith('/cart')
  ) {
    return false
  }
  return true
}

const isSafeStaticAsset = (request, url) => {
  if (request.method !== 'GET') return false
  if (url.origin !== self.location.origin) return false
  return ['style', 'script', 'font', 'image'].includes(request.destination)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (isStorefrontNavigation(request, url)) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedOfflinePage = await caches.match(OFFLINE_PAGE)
        return cachedOfflinePage || Response.error()
      }),
    )
    return
  }

  if (isSafeStaticAsset(request, url)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              cache.put(request, response.clone())
            }
            return response
          })
          .catch(() => cached)

        return cached || networkFetch
      }),
    )
  }
})
