// JACOB'S service worker: shows push notifications and opens their in-app link.
// No caching on purpose — the app is always loaded fresh from the network.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

/** Only links inside this app's scope may be opened; anything else falls back to the app. */
function safeUrl(url) {
  try {
    const target = new URL(url || '', self.registration.scope)
    return target.href.startsWith(self.registration.scope) ? target.href : self.registration.scope
  } catch {
    return self.registration.scope
  }
}

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title || "JACOB'S", {
        body: data.body || '',
        tag: data.tag,
        lang: 'he',
        dir: 'rtl',
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        data: { url: safeUrl(data.url) },
      })
      // An open app refreshes its notification centre right away.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windows) client.postMessage({ type: 'push' })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = safeUrl(event.notification.data && event.notification.data.url)
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((client) => client.url.startsWith(self.registration.scope))
      if (open && 'navigate' in open) {
        await open.focus()
        return open.navigate(url)
      }
      return self.clients.openWindow(url)
    })(),
  )
})
