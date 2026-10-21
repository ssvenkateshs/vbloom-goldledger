/*
 * Cross-origin isolation shim for static hosts that cannot set response headers
 * (GitHub Pages). expo-sqlite on web needs SharedArrayBuffer, which browsers only
 * expose when the document is served with Cross-Origin-Opener-Policy and
 * Cross-Origin-Embedder-Policy. This service worker adds those headers to every
 * same-origin response, then reloads the page once so they take effect.
 *
 * Hosts that can set headers (EAS Hosting, Netlify, Cloudflare) do not need this
 * file; it is harmless there because an already-isolated page never registers it.
 */
/* eslint-disable */
if (typeof window === 'undefined') {
  // ---- service worker context ----
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
  self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;
    event.respondWith(
      fetch(request).then((response) => {
        if (response.status === 0) return response;
        const headers = new Headers(response.headers);
        headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
        headers.set('Cross-Origin-Opener-Policy', 'same-origin');
        headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
      }),
    );
  });
} else {
  // ---- page context ----
  (async () => {
    if (window.crossOriginIsolated || !('serviceWorker' in navigator)) return;
    const script = document.currentScript;
    const url = script && script.src ? script.src : 'coi-serviceworker.js';
    try {
      const registration = await navigator.serviceWorker.register(url);
      if (registration.active && !navigator.serviceWorker.controller) {
        // Worker installed earlier but this load was not controlled: reload to pick up headers.
        window.location.reload();
        return;
      }
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker &&
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated' && !window.crossOriginIsolated) window.location.reload();
          });
      });
    } catch (e) {
      console.warn('coi-serviceworker: registration failed', e);
    }
  })();
}
