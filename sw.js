/* ============================================================
  SERVICE WORKER — hace que la app funcione sin conexión.
  Es un script que el navegador ejecuta aparte de la página y que
  intercepta cada petición de red.
  Copyright (C) AÑO TU NOMBRE
  SPDX-License-Identifier: GPL-3.0-or-later
============================================================ */

// Nombre de la "caja" donde se guardan las copias. Si algún día cambias
// la estructura de la app, súbelo a 'poemario-v2' para limpiar las viejas.
var CACHE = 'poemario-v1';

// Archivos básicos que se guardan en la primera visita.
var BASE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'poemas/index.json'];

// INSTALAR: guarda los archivos básicos. Si alguno falta, se ignora.
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return Promise.all(BASE.map(function (u) { return c.add(u).catch(function () {}); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

// ACTIVAR: borra cajas de versiones anteriores y toma el control de la página.
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

// PETICIONES: solo intercepta lo de tu propio sitio y solo lecturas (GET).
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(redPrimero(req));
});

// Estrategia "red primero": con internet, trae lo más nuevo (así los poemas
// nuevos aparecen) y guarda una copia. Sin internet, o si la red tarda más de
// 4 segundos, usa la copia guardada.
function redPrimero(req) {
  var red = fetch(req).then(function (res) {
    if (res && res.ok) {
      var copia = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copia); });
    }
    return res;
  });
  var limite = new Promise(function (_, rechazo) { setTimeout(rechazo, 4000); });
  return Promise.race([red, limite]).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (r) {
      return r || (req.mode === 'navigate' ? caches.match('index.html') : null) || red;
    });
  });
}
