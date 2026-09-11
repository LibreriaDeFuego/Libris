// Service worker mínimo — existe solo para que Chrome/Android considere la
// app instalable como PWA (el criterio pide un service worker registrado
// con un manejador de "fetch"; no hace falta que ese manejador haga nada).
//
// A propósito, NO cachea nada. La versión anterior guardaba en caché cada
// respuesta y, si la red fallaba, caía a ese caché — pero con los
// despliegues seguidos que tiene esta app (cada uno cambia el nombre con
// hash de los archivos CSS/JS), una conexión débil que fallaba justo al
// pedir un archivo nuevo (uno recién generado, nunca antes cacheado) se
// quedaba sin nada a lo que "caer": la app cargaba sin estilos, sin
// fuentes, sin imágenes — la pantalla se veía "rota", aunque el HTML y el
// JS sí llegaran. Como ninguna pantalla de esta app es realmente usable sin
// red (todo es server-rendered, ƒ dinámica — no hay nada que "leer
// offline" de verdad), el beneficio de cachear no compensaba ese riesgo.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Limpieza única: borra cualquier caché que haya quedado de la versión
  // anterior de este service worker (se llamaba "libris-shell-v1"), para
  // no dejarla ocupando espacio ni sirviendo, por accidente, algo viejo.
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

// Sin caching: cada pedido pasa directo a la red (el comportamiento por
// default del navegador cuando el manejador no llama a respondWith()). El
// manejador solo tiene que existir para que Chrome considere la app
// instalable — no hace falta que intercepte nada.
self.addEventListener('fetch', () => {});
