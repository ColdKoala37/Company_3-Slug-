// Saves the app's files on the phone so it opens without internet.
// When there is internet it asks GitHub for the newest files first,
// so an update you upload shows up the next time you open the app.

const CACHE = 'slug-v2';
const FILES = [
  './', 'index.html', 'manifest.json', 'icon.png',
  'splash.webp', 'age.webp', 'map.webp', 'loading.webp', 'ring.webp',
  'simon.webp', 'battle.webp', 'sudoku.webp',
  'badge-simon.webp', 'badge-battle.webp', 'badge-garbage.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES.map(file => new Request(file, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(newestFirst(request));
});

// Internet first. Use the saved copy when offline, or when the signal is so weak
// that nothing has arrived after 4 seconds.
async function newestFirst(request) {
  const cache = await caches.open(CACHE);
  const saved = async () =>
    (await cache.match(request, { ignoreSearch: true })) ||
    (request.mode === 'navigate' ? cache.match('./') : undefined);

  return new Promise(resolve => {
    let answered = false;
    const answer = response => {
      if (response && !answered) { answered = true; resolve(response); }
    };
    fetch(request)
      .then(response => {
        if (response.ok) cache.put(request, response.clone());
        answer(response);
      })
      .catch(async () => answer((await saved()) || Response.error()));
    setTimeout(async () => answer(await saved()), 4000);
  });
}
