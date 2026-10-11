// Saves the app's files on the iPad (or phone) so it opens without internet.
// When there is internet it asks GitHub for the newest files first,
// so an update you upload shows up the next time you open the app.

const CACHE = 'slug-v13';
const FILES = [
  './', 'index.html', 'manifest.json', 'app-icon-180.png', 'app-icon-192.png', 'app-icon-512.png', 'nunito.woff2', 'splash.png', 'age.png', 'map.png',
  'loading.png', 'ring.webp',
  // map
  'fish.png', 'map-amb.png', 'map-bike.png', 'map-boat.png', 'map-bus.png', 'map-butterfly.png',
  'map-can.png', 'map-car.png', 'map-dfly-body.png', 'map-dfly-wings.png', 'map-duck-1.png',
  'map-duck-2.png', 'map-duck-3.png', 'map-ember.png', 'map-fill-amb.png', 'map-fill-bike.png',
  'map-fill-boat.png', 'map-fill-bus.png', 'map-fill-butterfly.png', 'map-fill-can.png', 'map-fill-dfly.png',
  'map-fill-duck-1.png', 'map-fill-duck-2.png', 'map-fill-duck-3.png', 'map-fill-flag.png',
  'map-fill-flame.png', 'map-fill-frog.png', 'map-fill-rod.png', 'map-fill-splash.png', 'map-flag.png',
  'map-flame-core.png', 'map-flame.png', 'map-frog.png', 'map-label-battle.png', 'map-label-profile.png',
  'map-label-simon.png', 'map-label-sudoku.png', 'map-rod.png', 'map-splash.png',
  // simon
  'simon-all.png', 'simon-blue.png', 'simon-board.png', 'simon-green.png', 'simon-map-button.png',
  'simon-red.png', 'simon-yellow.png',
  // battle
  'battle-board.png', 'crosshair.png', 'duck-cover-1-1.png', 'duck-cover-1-2.png', 'duck-cover-1-3.png',
  'duck-cover-1-4.png', 'duck-cover-2-1.png', 'duck-cover-2-2.png', 'duck-cover-2-3.png',
  'duck-cover-3-1.png', 'duck-cover-3-2.png', 'duck-cover-4-1.png', 'duck-cover-4-2.png',
  'duck-cover-5-1.png', 'duck-cover-5-2.png',
  // sudoku
  'bin-blue.png', 'bin-green.png', 'bin-red.png', 'bin-yellow.png', 'sudoku-board.png',
  // my profile
  'profile.png', 'wear-antenna-1.png', 'wear-antenna-2.png', 'wear-backpack.png', 'wear-doctor.png',
  'wear-explorer-hat.png', 'wear-fill-antennae.png', 'wear-head.png', 'wear-overalls.png',
  'wear-raincoat.png', 'wear-shade-doctor.png', 'wear-shade-overalls.png', 'wear-shade-raincoat.png',
  'wear-shade-sporty.png', 'wear-slug.png', 'wear-sporty.png', 'wear-straw-hat.png',
  // parental controls
  'settings.png'
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
