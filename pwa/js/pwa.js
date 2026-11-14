import {confirmar,mostrarDialogo,mensajeEstado} from './dialogos.js';
let registro=null,recargando=false,teniaControl=Boolean(navigator.serviceWorker?.controller);
const eventos=new AbortController();
// El trabajador actualizado solo reemplaza al anterior después de que el usuario lo acepte.
export async function buscarActualizacion() {
 if(!registro){await mostrarDialogo('Actualización','La instalación offline todavía no está disponible en este navegador.');return;}
 try {
  await registro.update();
  if(registro.waiting&&await confirmar('Hay una versión nueva. ¿Actualizar y recargar WORLD GAMES?'))registro.waiting.postMessage({tipo:'ACTIVAR'});
  else if(!registro.waiting)mensajeEstado('Se comprobó la versión. No hay una actualización lista.');
 }catch{mensajeEstado('No se pudo buscar una actualización. Conservamos la versión disponible sin conexión.');}
}
export function iniciarPWA() {
 const estado=document.getElementById('conexion');
 const conexion=()=>{estado.textContent=navigator.onLine?'● En línea':'○ Sin conexión';estado.style.color=navigator.onLine?'#51ff9a':'#ffcc77';};
 window.addEventListener('online',conexion,{signal:eventos.signal});window.addEventListener('offline',conexion,{signal:eventos.signal});conexion();
 if('serviceWorker'in navigator){
  navigator.serviceWorker.register('./sw.js').then(r=>{
   registro=r;
   const avisar=()=>{if(r.waiting)mensajeEstado('Actualización disponible. Abre Más → Ajustes para instalarla.');};
   avisar();r.addEventListener('updatefound',()=>{const worker=r.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)avisar();});});
  }).catch(()=>mensajeEstado('El navegador no pudo activar el modo offline. La página sigue disponible en línea.'));
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!teniaControl){teniaControl=true;return;}if(!recargando){recargando=true;location.reload();}},{signal:eventos.signal});
 }
 window.addEventListener('beforeinstallprompt',evento=>{
  evento.preventDefault();const boton=document.getElementById('instalar');boton.hidden=false;
  boton.onclick=async()=>{try{await evento.prompt();await evento.userChoice;boton.hidden=true;}catch{mensajeEstado('Puedes instalarla desde el menú del navegador compatible.');}};
 },{signal:eventos.signal});
}
