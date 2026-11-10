//one worker for every game, each registers it with its own folder as scope
const CACHE = self.registration.scope
//the worker before the games moved into folders, cached under one name at the root
const LEGACY = 'minesweeper'
const root = self.registration.scope === new URL('./', self.location).href

self.addEventListener('install', () => self.skipWaiting())

//drop the old cache, retire the old root registration and reload tabs they served
//other caches on the host belong to other sites or games, so they are left alone
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const stale = await caches.delete(LEGACY)
      if (root) await self.registration.unregister()
      else await self.clients.claim()
      if (!stale && !root) return
      const tabs = await self.clients.matchAll({ type: 'window' })
      tabs.forEach((tab) => tab.navigate(tab.url))
    })(),
  )
})

//keeps a copy for offline, in place of any older version of the same file (?v=<hash>)
const keep = async (request, copy) => {
  const cache = await caches.open(CACHE)
  if (new URL(request.url).searchParams.has('v')) {
    const versions = await cache.keys(request, { ignoreSearch: true })
    await Promise.all(
      versions.filter((old) => old.url !== request.url).map((old) => cache.delete(old)),
    )
  }
  await cache.put(request, copy)
}

//network first, cache only for offline
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (root || request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return
  event.respondWith(
    fetch(request)
      .then((response) => {
        //only whole, good answers are worth keeping, an error page would come back offline
        //the worker stays up until the copy is stored
        if (response.status === 200)
          event.waitUntil(keep(request, response.clone()).catch(() => {}))
        return response
      })
      .catch(() => caches.match(request)),
  )
})
