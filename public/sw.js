/* Service worker minimo, senza cache.
   Chrome lo richiede per mostrare "Installa" sul computer.
   Schede e accessi restano solo online. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  /* Nessun respondWith: la richiesta segue la rete. */
});
