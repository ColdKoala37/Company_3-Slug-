// Saves the app's files on the iPad (or phone) so it opens without internet.
// When there is internet it asks GitHub for the newest files first,
// so an update you upload shows up the next time you open the app.

const CACHE = 'slug-v16';
const FILES = [
  './', 'index.html', 'manifest.json', 'app-icon-180.png', 'app-icon-192.png', 'app-icon-512.png', 'apple-touch-icon.png', 'slug-icon.png', 'icon.png', 'nunito.woff2', 'splash.png', 'age.png', 'map.png',
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
  'battle.webp',
  // sudoku
  'bin-blue.png', 'bin-green.png', 'bin-red.png', 'bin-yellow.png', 'sudoku-board.png',
  // my profile
  'profile.png', 'wear-cards.png', 'wear-antenna-1.png', 'wear-antenna-2.png', 'wear-fill-antennae.png',
  'wear-head.png', 'wear-slug.png', 'wear-explorer-hat.png', 'wear-cap.png', 'wear-top-hat.png',
  'wear-straw-hat.png', 'wear-tie.png', 'wear-shade-tie.png', 'wear-propeller-cap.png', 'wear-propeller.png',
  'wear-propeller-hub.png',
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
  const ready = (async () => {
    const keys = await caches.keys();
    const updated = keys.some(key => key !== CACHE);          // an older version of the app was saved here
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
    return updated;
  })();
  event.waitUntil(ready);
  // a page that was opened before the update may still be the old one: once this version is ready,
  // open it again so it is the new one (not waited for, so the page's own loading isn't held up)
  ready.then(async updated => {
    if (!updated) return;
    for (const page of await self.clients.matchAll({ type: 'window' })) {
      page.navigate(page.url).catch(() => { /* it shows the new version next time instead */ });
    }
  });
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(newestFirst(request));
});

// The page and the app's settings file are never taken from the browser's short-term store without asking
// GitHub whether they changed (a quick "has this changed?" question), so a new upload shows up straight away.
function checkWithGitHub(request) {
  const path = new URL(request.url).pathname;
  if (request.mode !== 'navigate' && !/\.(html|json)$/.test(path) && !path.endsWith('/')) return request;
  try { return new Request(request, { cache: 'no-cache' }); } catch (err) { return request; }
}

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
    fetch(checkWithGitHub(request))
      .then(response => {
        if (response.ok) cache.put(request, response.clone());
        answer(response);
      })
      .catch(async () => answer((await saved()) || Response.error()));
    setTimeout(async () => answer(await saved()), 4000);
  });
}
