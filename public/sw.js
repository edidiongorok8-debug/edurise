/* EduRise service worker — full offline: precache all pages & assets, network-first pages, stale-while-revalidate static */
var CACHE = "edurise-v53";
var CORE = [
  "/", "/student", "/study", "/tutor", "/school-finder", "/settings", "/competitions",
  "/sign-in", "/register", "/setup", "/past-questions",
    "/practice", "/dashboard", "/privacy", "/terms", "/404.html",
  "/assets/css/app.css",
  "/assets/js/analytics.js", "/assets/js/api.js", "/assets/js/config.js",
  "/assets/js/cookie-banner.js", "/assets/js/dashboard.js", "/assets/js/home.js",
  "/assets/js/register.js", "/assets/js/school-finder-data.js", "/assets/js/settings.js", "/assets/js/setup.js",
  "/assets/js/competitions.js", "/assets/js/study.js", "/assets/js/theme.js", "/assets/js/tutor.js",
  "/assets/js/verse-splash.js", "/assets/js/verses.js",
  "/assets/js/past-questions.js", "/assets/js/past-questions-data.js",
  "/assets/js/practice-data.js",
  "/assets/js/practice.js",
  "/assets/js/animations.js",
  "/assets/js/progress.js",
  "/icons/icon-192.png", "/icons/icon-512.png",
  "/manifest.webmanifest", "/favicon.ico", "/apple-touch-icon.png"
];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(CORE.map(function (u) {
      return c.match(u) ? Promise.resolve() : c.add(u).catch(function () {});
    }));
  }).then(function () { self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/api/") === 0) return;
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).then(function (r) {
      var copy = r.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy).catch(function () {}); });
      return r;
    }).catch(function () {
      return caches.match(e.request).then(function (m) {
        if (m) return m;
        return caches.match(url.pathname).then(function (m2) { return m2 || caches.match("/"); });
      });
    }));
  } else if (/\.(js|css)$/.test(url.pathname) || url.pathname === "/manifest.webmanifest") {
    /* network-first for code: users always run the latest version; offline falls back to cache */
    e.respondWith(fetch(e.request).then(function (r) {
      if (r && r.ok) {
        var copy = r.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy).catch(function () {}); });
      }
      return r;
    }).catch(function () {
      return caches.match(e.request).then(function (m) { return m || Response.error(); });
    }));
  } else {
    /* stale-while-revalidate: instant from cache, refreshed in the background,
       so images etc. update on the next visit */
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(e.request).then(function (m) {
        var net = fetch(e.request).then(function (r) {
          if (r && r.ok) c.put(e.request, r.clone()).catch(function () {});
          return r;
        }).catch(function () { return m; });
        return m || net;
      });
    }));
  }
});
