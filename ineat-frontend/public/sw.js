const CACHE_NAME = 'ineat-public-v1';
const PUBLIC_ASSETS = [
	'/manifest.webmanifest',
	'/pwa-icon-192.png',
	'/pwa-icon-512.png',
	'/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_ASSETS))
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
			)
			.then(() => self.clients.claim())
	);
});

// All application and authenticated API traffic stays network-only. The cache
// is deliberately limited to the public PWA metadata listed above.
self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== self.location.origin || !PUBLIC_ASSETS.includes(url.pathname)) return;

	event.respondWith(
		caches.match(event.request).then((cached) => cached || fetch(event.request))
	);
});
