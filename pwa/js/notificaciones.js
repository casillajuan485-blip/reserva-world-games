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
export function ocultarAviso(){clearTimeout(temporizador);const aviso=document.getElementById('toast');if(aviso)window.jQuery(aviso).stop(true,true).hide();}
export function notificar(texto,{duracion=4000}={}) {
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
 document.addEventListener('focusout',()=>setTimeout(mostrarPendiente,100));
 window.addEventListener('pagehide',()=>{pendiente=null;ocultarAviso();});
}
