const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./app-BJ2WwapR.js","./jquery-CJAO5CMo.js","./notificaciones-lJ5L-YKu.js","./data-CU8c90-g.js","./dialogos-BHfZJNJV.js","./almacenamiento-Cf3sOArk.js","./seguridad-B30-y2DD.js"])))=>i.map(i=>d[i]);
/* empty css             */
import { _ as __vitePreload } from './jquery-CJAO5CMo.js';
import { n as notificar, o as ocultarAviso } from './notificaciones-lJ5L-YKu.js';

true              &&(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
}());

// La carga usa un mensaje en su propia fila y se retira cuando está lista la aplicación.
notificar('Cargando WORLD GAMES…',{duracion:0});
try{
 await __vitePreload(() => import('./app-BJ2WwapR.js'),true              ?__vite__mapDeps([0,1,2,3,4,5,6]):void 0,import.meta.url);ocultarAviso();
 const {catalogoRecuperado}=await __vitePreload(async () => { const {catalogoRecuperado} = await import('./data-CU8c90-g.js');return {catalogoRecuperado}},true              ?[]:void 0,import.meta.url);
 if(catalogoRecuperado)notificar('Se recuperó el catálogo local. Puedes continuar usando WORLD GAMES.');
}catch(error){notificar('No se pudo iniciar WORLD GAMES. Revisa la conexión y vuelve a abrir la página.',{duracion:0});console.error(error);}
