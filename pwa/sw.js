// Proxy offline. La lista de precarga se genera a partir de los archivos publicados.
const ALCANCE = new URL(self.registration.scope);
const PREFIJO = 'world-games-' + encodeURIComponent(ALCANCE.pathname) + '-';
const VERSION = PREFIJO + '71b4278b0364';
const RECURSOS = [
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./css/componentes.css",
  "./css/diseno-world-games.css",
  "./data/equipos.json",
  "./data/promociones.json",
  "./data/snacks.json",
  "./imagenes/equipos-neon.jpg",
  "./imagenes/hero-neon.jpg",
  "./imagenes/icon-192.png",
  "./imagenes/icon-512.png",
  "./imagenes/icon-maskable-512.png",
  "./imagenes/iconos.svg",
  "./imagenes/logo-pie.png",
  "./imagenes/promo-2.svg",
  "./imagenes/promo-3.svg",
  "./imagenes/promo-4.svg",
  "./imagenes/promo-refresco.svg",
  "./imagenes/robot.svg",
  "./imagenes/snacks-neon.jpg",
  "./js/compilado/ajustes-B4YZZ4CD.js",
  "./js/compilado/chunk-2PYQHHHL.js",
  "./js/compilado/chunk-J4Q76PQY.js",
  "./js/compilado/chunk-LF4XRCXJ.js",
  "./js/compilado/chunk-VVVUL4VY.js",
  "./js/compilado/chunk-Z5BJBYZC.js",
  "./js/compilado/contactos-6MSYCQWG.js",
  "./js/compilado/historial-FO22CT3D.js",
  "./js/compilado/inicio.js",
  "./js/compilado/metricas-web-LQS3MDS7.js",
  "./js/compilado/reservas-catalogos-ZSXHKBS3.js"
];
const CDN = new Set([
  'https://cdn.jsdelivr.net/npm/dompurify@3.4.18/dist/purify.min.js',
  'https://cdn.jsdelivr.net/npm/web-vitals@6.2.3/dist/web-vitals.js'
]);

self.addEventListener('install', evento => {
  evento.waitUntil(caches.open(VERSION).then(cache => cache.addAll(RECURSOS)));
});
self.addEventListener('message', evento => {
  if (evento.data?.tipo === 'ACTIVAR') self.skipWaiting();
});
self.addEventListener('activate', evento => {
  // Limpia exclusivamente las versiones de esta aplicación dentro del mismo ámbito.
  const legado = 'world-games-v4-' + encodeURIComponent(ALCANCE.pathname) + '-';
  evento.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.filter(nombre => nombre !== VERSION && (nombre.startsWith(PREFIJO) || nombre.startsWith(legado))).map(nombre => caches.delete(nombre)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', evento => {
  const peticion = evento.request;
  const url = new URL(peticion.url);
  const local = url.origin === ALCANCE.origin && url.pathname.startsWith(ALCANCE.pathname);
  const externa = CDN.has(url.href) || (url.protocol === 'https:' && ['images.unsplash.com', 'upload.wikimedia.org'].includes(url.hostname));
  if (peticion.method !== 'GET' || (!local && !externa)) return;
  evento.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const anterior = await cache.match(peticion);
    // Archivos versionados y catálogos: caché primero. Navegación: red primero y respaldo local.
    if (peticion.mode !== 'navigate' && anterior) return anterior;
    try {
      const respuesta = await fetch(peticion);
      if (!respuesta.ok && respuesta.type !== 'opaque') {
        if (peticion.mode === 'navigate') return anterior || await cache.match('./offline.html') || respuesta;
        return respuesta;
      }
      if (externa) {
        try {
          await cache.put(peticion, respuesta.clone());
          const remotas = (await cache.keys()).filter(clave => new URL(clave.url).origin !== ALCANCE.origin);
          if (remotas.length > 32) await cache.delete(remotas[0]);
        } catch { /* El recurso descargado sigue disponible si el navegador rechaza guardarlo. */ }
      }
      return respuesta;
    } catch {
      if (peticion.mode === 'navigate') return anterior || await cache.match('./index.html') || await cache.match('./offline.html') || Response.error();
      return anterior || Response.error();
    }
  })());
});
