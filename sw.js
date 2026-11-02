/* Infinity App service worker: keeps the app on the device so it opens and works without internet.
   - the app's own files: saved when the app is installed (list below), then served from the device
   - data/tools.json: fresh from the network when online, the saved copy when offline
   - libraries and fonts from CDNs (PDF, QR, ZIP…): saved the first time they are used
   Designed & Developed by Nivesh Sahayak. See LICENSE. */
var VERSION = '2026-11-02.7-d2c9901d';
var CORE = 'gco-app-' + VERSION, EXT = 'gco-app-ext';
var FILES = [
 "./",
 "index.html",
 "app.js?v=2026-11-02.7-d2c9901d",
 "app.css?v=2026-11-02.7-d2c9901d",
 "manifest.webmanifest",
 "data/tools.json",
 "assets/infinity.css?v=2026-11-02.7-d2c9901d",
 "assets/tools/kit.js?v=2026-11-02.7-d2c9901d",
 "assets/tools/tools.css",
 "assets/brand/favicon-32.png",
 "assets/brand/favicon-192.png",
 "assets/brand/favicon-512.png",
 "assets/brand/apple-touch-icon.png",
 "assets/tools/_invoice.js",
 "assets/tools/attendance.js",
 "assets/tools/bill-reminders.js",
 "assets/tools/book-keeper.js",
 "assets/tools/credit-note.js",
 "assets/tools/customer-book.js",
 "assets/tools/delivery-challan.js",
 "assets/tools/diary.js",
 "assets/tools/gst-register.js",
 "assets/tools/health-log.js",
 "assets/tools/invoice.js",
 "assets/tools/kitty-tracker.js",
 "assets/tools/lend-borrow.js",
 "assets/tools/medicine-schedule.js",
 "assets/tools/milk-hisab.js",
 "assets/tools/money-manager.js",
 "assets/tools/my-data.js",
 "assets/tools/portfolio.js",
 "assets/tools/proforma-invoice.js",
 "assets/tools/purchase-order.js",
 "assets/tools/quotation.js",
 "assets/tools/reading-log.js",
 "assets/tools/receipt.js",
 "assets/tools/recipe-book.js",
 "assets/tools/rent-tracker.js",
 "assets/tools/salary-register.js",
 "assets/tools/shagun-register.js",
 "assets/tools/stock-register.js",
 "assets/tools/study-planner.js",
 "assets/tools/vehicle-log.js",
 "assets/tools/workout-log.js"
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CORE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CORE && k !== EXT; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {   // pages: fresh when online; offline, the saved copy of that page (a single-tool app), else the app shell
      var shell = function () {
        return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match('./', { ignoreSearch: true }); }).then(function (r) { return r || caches.match('index.html'); });
      };
      e.respondWith(fetch(req).then(function (r) {
        if (r.ok) { var copy = r.clone(); caches.open(EXT).then(function (c) { c.put(req.url.split('?')[0], copy); }); return r; }
        return shell().then(function (c) { return c || r; });
      }, shell));
      return;
    }
    if (/\/data\/tools\.json$/.test(url.pathname)) {   // the tool list: network first
      e.respondWith(fetch(req).then(function (r) { var copy = r.clone(); caches.open(CORE).then(function (c) { c.put('data/tools.json', copy); }); return r; })
        .catch(function () { return caches.match('data/tools.json'); }));
      return;
    }
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {   // files carry ?v=…; the saved copy is the same version
      return hit || fetch(req).then(function (r) { if (r.ok) { var copy = r.clone(); caches.open(CORE).then(function (c) { c.put(req, copy); }); } return r; });
    }));
    return;
  }
  // libraries and fonts: use the saved copy, refresh it in the background
  if (/^(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com|unpkg\.com)$/.test(url.hostname)) {
    e.respondWith(caches.open(EXT).then(function (c) {
      return c.match(req).then(function (hit) {
        var live = fetch(req).then(function (r) { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(function () { return hit; });
        return hit || live;
      });
    }));
  }
});
