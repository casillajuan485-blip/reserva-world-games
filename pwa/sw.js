// Trabajador de WORLD GAMES: recursos locales versionados y recuperación sin conexión.
const PREFIJO='world-games-v4-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-',VERSION=PREFIJO+"world-games-a07bb44ec889",RECURSOS=["./css/original.css","./css/pwa.css","./data/catalogos.json","./imagenes/equipos-neon.png","./imagenes/hero-neon.png","./imagenes/icon-192.png","./imagenes/icon-512.png","./imagenes/iconos.svg","./imagenes/logo-world-games.png","./imagenes/promo-2.svg","./imagenes/promo-3.svg","./imagenes/promo-4.svg","./imagenes/promo-refresco.svg","./imagenes/robot.svg","./imagenes/snacks-neon.png","./index.html","./js/ajustes.js","./js/almacenamiento.js","./js/app.js","./js/bootstrap.js","./js/calculos.js","./js/campana.js","./js/contactos.js","./js/data-original.js","./js/data.js","./js/dialogos.js","./js/historial.js","./js/horarios.js","./js/notificaciones.js","./js/pwa.js","./js/seguridad.js","./js/teclado.js","./js/ui.js","./js/utilidades.js","./js/validaciones.js","./js/vendor/jquery.js","./manifest.webmanifest","./offline.html"];
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(RECURSOS))));
self.addEventListener('message',e=>{if(e.data?.tipo==='ACTIVAR')self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(n=>Promise.all(n.filter(k=>k.startsWith(PREFIJO)&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// La navegación prueba la red para descubrir una nueva versión y mantiene respaldo local.
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const url=new URL(e.request.url);
 if(url.origin!==self.location.origin&&!['images.unsplash.com','upload.wikimedia.org'].includes(url.hostname))return;
 e.respondWith((async()=>{
  const cache=await caches.open(VERSION);
  const anterior=await cache.match(e.request);
  if(e.request.mode!=='navigate'&&anterior)return anterior;
  try{
   const respuesta=await fetch(e.request);
   if(respuesta.ok||respuesta.type==='opaque'){
    await cache.put(e.request,respuesta.clone());
    const claves=await cache.keys(),externas=claves.filter(k=>new URL(k.url).origin!==self.location.origin);
    if(externas.length>60)await cache.delete(externas[0]);
    return respuesta;
   }
   if(e.request.mode==='navigate')return anterior||(await cache.match('./offline.html'))||respuesta;
   return respuesta;
  }catch{
   if(anterior)return anterior;
   if(e.request.mode==='navigate')return(await cache.match('./index.html'))||(await cache.match('./offline.html'))||Response.error();
   return Response.error();
  }
 })());
});