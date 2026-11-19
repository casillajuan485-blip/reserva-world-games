const pendientes=new Set();
// Las tareas breves de la vista se cancelan si el usuario navega antes de que terminen.
function aplazar(funcion,espera=0){
 const timer=setTimeout(()=>{pendientes.delete(timer);funcion();},espera);
 pendientes.add(timer);return timer;
}
// Agrupa clics rápidos de filtros sin cambiar su resultado ni generar animaciones repetidas.
function debounce(funcion,espera=100) {
 let temporizador;
 const ejecutar=function(...argumentos){clearTimeout(temporizador);pendientes.delete(temporizador);temporizador=setTimeout(()=>{pendientes.delete(temporizador);funcion.apply(this,argumentos);},espera);pendientes.add(temporizador);};
 ejecutar.cancelar=()=>{clearTimeout(temporizador);pendientes.delete(temporizador);};
 return ejecutar;
}
// Los relojes visuales se suspenden en pestañas ocultas y se recalculan al regresar.
function relojVisible(funcion,intervalo=1000,vistas=null) {
 let timer,retirado=false;
 const parar=()=>{clearInterval(timer);timer=null;};
 const iniciar=()=>{
  parar(); // Solo puede existir un intervalo por reloj, aunque se navegue muchas veces.
  if(retirado || document.hidden || (vistas&&!vistas.includes(document.body.dataset.pantalla)))return;
  funcion();
  // El propio callback puede cerrar el modal al detectar que venció mientras la pestaña estaba oculta.
  if(!retirado)timer=setInterval(funcion,intervalo);
 };
 document.addEventListener('visibilitychange',iniciar);window.addEventListener('pageshow',iniciar);window.addEventListener('pagehide',parar);window.addEventListener('wg:vista',iniciar);iniciar();
 return ()=>{retirado=true;parar();document.removeEventListener('visibilitychange',iniciar);window.removeEventListener('pageshow',iniciar);window.removeEventListener('pagehide',parar);window.removeEventListener('wg:vista',iniciar);};
}
const cancelarPendientes=()=>{pendientes.forEach(clearTimeout);pendientes.clear();};
window.addEventListener('pagehide',cancelarPendientes);
window.addEventListener('wg:vista',cancelarPendientes); // Un filtro pendiente no se ejecuta en otra pantalla.

let temporizador=null,pendiente=null;
const escribiendo=()=>Boolean(document.activeElement?.matches('input[type=text],input[type=email],input[type=tel],input[type=search],textarea'));
// Los avisos ocupan una fila propia, sin flotar sobre controles o campos.
function ubicar() {
 const aviso=document.getElementById('toast');if(!aviso)return null;
 const modal=[...document.querySelectorAll('.modal')].find(e=>!e.hidden&&e.getClientRects().length);
 const destino=modal?.querySelector('.modal-caja')||document.querySelector('.vista:not([hidden])');
 if(destino&&aviso.parentElement!==destino)destino.prepend(aviso);
 return aviso;
}
function ocultarAviso(){clearTimeout(temporizador);const aviso=document.getElementById('toast');if(aviso)window.jQuery(aviso).stop(true,true).hide();}
function notificar(texto,{duracion=4000}={}) {
 clearTimeout(temporizador);
 // La ayuda específica del campo permanece visible; los avisos secundarios esperan a que termine la escritura.
 if(escribiendo()||document.body.classList.contains('teclado-activo')){pendiente={texto,duracion};ocultarAviso();return;}
 pendiente=null;const aviso=ubicar();if(!aviso)return;
 aviso.textContent=String(texto);window.jQuery(aviso).stop(true,true).show();
 if(duracion>0)temporizador=setTimeout(ocultarAviso,duracion);
}
function mostrarPendiente(){if(pendiente&&!escribiendo()&&!document.body.classList.contains('teclado-activo')){const p=pendiente;pendiente=null;notificar(p.texto,{duracion:p.duracion});}}
if(typeof window!=='undefined'){
 window.addEventListener('wg:vista',()=>{ubicar();mostrarPendiente();});
 window.addEventListener('wg:teclado',evento=>{if(evento.detail.abierto)ocultarAviso();else mostrarPendiente();});
 document.addEventListener('focusout',()=>aplazar(mostrarPendiente,100));
 window.addEventListener('pagehide',()=>{pendiente=null;ocultarAviso();});
}

export { aplazar as a, debounce as d, notificar as n, ocultarAviso as o, relojVisible as r };
