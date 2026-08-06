// Minimal service worker: no offline caching, just presence so the app
// is installable to the home screen and can show notifications on iOS.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
