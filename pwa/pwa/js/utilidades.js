const pendientes=new Set();
// Agrupa clics rápidos de filtros sin cambiar su resultado ni generar animaciones repetidas.
export function debounce(funcion,espera=100) {
 let temporizador;
 return function(...argumentos){clearTimeout(temporizador);pendientes.delete(temporizador);temporizador=setTimeout(()=>{pendientes.delete(temporizador);funcion.apply(this,argumentos);},espera);pendientes.add(temporizador);};
}
// Los relojes visuales se suspenden en pestañas ocultas y se recalculan al regresar.
export function relojVisible(funcion,intervalo=1000) {
 let timer;
 const parar=()=>{clearInterval(timer);timer=null;};
 const iniciar=()=>{parar();funcion();if(!document.hidden)timer=setInterval(funcion,intervalo);};
 document.addEventListener('visibilitychange',iniciar);window.addEventListener('pageshow',iniciar);window.addEventListener('pagehide',parar);iniciar();
 return ()=>{parar();document.removeEventListener('visibilitychange',iniciar);window.removeEventListener('pageshow',iniciar);window.removeEventListener('pagehide',parar);};
}
window.addEventListener('pagehide',()=>{pendientes.forEach(clearTimeout);pendientes.clear();});
