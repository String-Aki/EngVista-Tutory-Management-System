const CACHE_NAME = "icms-student-cache-v1";

// We install immediately to bypass the 'waiting' state and directly claim the client.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Just aggressively cache the top-level icons and offline state if necessary.
      // We don't want to heavily cache Next.js App Router dynamic routes because they break easily.
      return cache.addAll([
        "/icon.png"
      ]);
    })
  );
  self.skipWaiting();
});

// Clean up old caches if the version bumps
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

// A standard network-first fetch strategy
self.addEventListener("fetch", (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;
  // Ignore chrome-extension and Next.js hot-reloading stuff
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .catch((err) => {
         // If offline, fallback to the cache (this satisfies Chrome's installation criteria!)
         return caches.match(event.request);
      })
  );
});

// Push Notification Reception Engine
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/icon.png",
      badge: "/icon.png",
      data: { url: data.url || "/" }
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Handle user clicking the frozen banner
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
