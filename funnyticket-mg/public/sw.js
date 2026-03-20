// Service Worker for FunnyTicket Push Notifications
/// <reference lib="webworker" />

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self))

sw.addEventListener('push', function (event) {
  if (!event.data) return

  const data = event.data.json()

  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'funnyticket',
    data: {
      url: data.url || '/client/tickets',
    },
  }

  event.waitUntil(sw.registration.showNotification(data.title || 'FunnyTicket', options))
})

sw.addEventListener('notificationclick', function (event) {
  event.notification.close()

  const url = event.notification.data?.url || '/client/tickets'

  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes('/client') && 'focus' in client) {
          return client.focus()
        }
      }
      return sw.clients.openWindow(url)
    })
  )
})
