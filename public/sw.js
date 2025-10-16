// Empty service worker to prevent 404 errors
// This file exists to satisfy cached browser requests
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});



