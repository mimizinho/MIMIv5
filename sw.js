var CACHE = "mimi-shell-v1";
var SCOPE = self.registration.scope;
var KEY = SCOPE + "index.html";
var VKEY = SCOPE + "__mimi_version";
var APP_PATH = new URL(SCOPE).pathname;
function refresh(c, first) {
  return fetch(SCOPE + "version.json?_=" + Date.now(), { cache: "no-store" })
    .then(function (r) { return r.ok ? r.text() : null; })
    .then(function (t) {
      if (!t) return;
      return c.match(VKEY).then(function (v) { return v ? v.text() : null; }).then(function (prev) {
        if (prev === t) return;
        return fetch(KEY, { cache: "reload" }).then(function (r) {
          if (!r.ok) return;
          return c.put(KEY, r).then(function () { return c.put(VKEY, new Response(t)); });
        });
      });
    })
    .catch(function () {});
}
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all([refresh(c, true), c.add(SCOPE + "offline.html").catch(function () {})]);
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "REFRESH") e.waitUntil(caches.open(CACHE).then(function (c) { return refresh(c, false); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/version\.json$/.test(url.pathname)) return;
  if (req.mode === "navigate") {
    var pth = url.pathname;
    if (pth !== APP_PATH && pth !== APP_PATH + "index.html") return;
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(KEY).then(function (hit) {
        if (hit) { e.waitUntil(refresh(c, false)); return hit; }
        return fetch(KEY).then(function (r) { if (r.ok) c.put(KEY, r.clone()); return r; })
          .catch(function () { return c.match(SCOPE + "offline.html"); });
      });
    }));
    return;
  }
  if (/\.(png|jpg|jpeg|svg|ico|webp|json|woff2?)$/.test(url.pathname)) {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (r) { if (r.ok) c.put(req, r.clone()); return r; });
        if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
        return net;
      });
    }));
  }
});
