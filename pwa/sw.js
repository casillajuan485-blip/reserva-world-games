// Trabajador de WORLD GAMES: recursos locales versionados y recuperación sin conexión.
const PREFIJO='world-games-v4-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-',VERSION=PREFIJO+"world-games-333c488a7c7e",RECURSOS=["./.vite/manifest.json","./assets/ajustes-BAJHlaRV.js","./assets/almacenamiento-Cf3sOArk.js","./assets/app-BJ2WwapR.js","./assets/contactos-jNnl173h.js","./assets/data-CU8c90-g.js","./assets/dialogos-BHfZJNJV.js","./assets/historial-b8NhdRsT.js","./assets/jquery-CJAO5CMo.js","./assets/manifest-jaqpaIMA.webmanifest","./assets/notificaciones-lJ5L-YKu.js","./assets/principal-DPcgTJ1o.js","./assets/pwa-Dk6AwSjE.css","./assets/seguridad-B30-y2DD.js","./data/catalogos.json","./imagenes/equipos-neon.png","./imagenes/hero-neon.png","./imagenes/icon-192.png","./imagenes/icon-512.png","./imagenes/iconos.svg","./imagenes/logo-world-games.png","./imagenes/promo-2.svg","./imagenes/promo-3.svg","./imagenes/promo-4.svg","./imagenes/promo-refresco.svg","./imagenes/robot.svg","./imagenes/snacks-neon.png","./index.html","./manifest.webmanifest","./offline.html"];
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