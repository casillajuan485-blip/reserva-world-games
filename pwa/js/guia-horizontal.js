// El modo horizontal solo cambia el desplazamiento de la reserva en móviles y tabletas.
export function esHorizontalMovil(ancho,alto,tactil=false) {
  return ancho>alto && (ancho<=1024 || tactil);
}
// Cada gesto invalida los avances pendientes: el usuario siempre conserva el control.
let revision=0;
let temporizador;
let inicializada=false;
let animando=false; // Solo se interrumpe un movimiento iniciado por la guía, nunca el desplazamiento libre.
// Se actualiza la clase al girar el teléfono o cambiar de pantalla, sin mover el foco.
export function actualizarHorizontal() {
  const activo=document.body.dataset.pantalla==='reservar' && esHorizontalMovil(window.innerWidth,window.innerHeight,window.matchMedia('(pointer: coarse)').matches);
  document.documentElement.classList.toggle('reserva-horizontal',activo);
  document.body.classList.toggle('reserva-horizontal',activo);
  return activo;
}
// Los eventos son pasivos: nunca cancelan el desplazamiento natural con el dedo.
export function iniciarGuiaHorizontal() {
  if(inicializada)return;
  inicializada=true;
  const cancelar=()=>{
    revision++;
    clearTimeout(temporizador);
  };
  const interrumpir=()=>{
    cancelar();
    // Detiene únicamente la animación en curso; el gesto continúa desplazando el documento.
    if(animando && document.body.classList.contains('reserva-horizontal')){
      window.scrollTo({top:window.scrollY,left:window.scrollX,behavior:'instant'});
      animando=false;
    }
  };
  document.addEventListener('pointerdown',cancelar,{passive:true});
  document.addEventListener('touchmove',interrumpir,{passive:true});
  document.addEventListener('wheel',interrumpir,{passive:true});
  window.addEventListener('resize',()=>{cancelar();actualizarHorizontal();});
  window.addEventListener('wg:vista',()=>{cancelar();actualizarHorizontal();});
  actualizarHorizontal();
}
// Espera a que los modelos, disponibilidad y validaciones terminen de actualizarse.
// El destino se calcula al ejecutar el avance, para no enfocar una máquina que ya no esté libre.
export function guiarHorizontal(resolver,origen=null) {
  const turno=++revision;
  clearTimeout(temporizador);
  temporizador=setTimeout(()=>{
    if(turno!==revision || !actualizarHorizontal())return;
    const activo=document.activeElement;
    // Una elección manual de otro campo tiene prioridad sobre el recorrido automático.
    if(origen && activo!==origen && activo!==document.body && activo?.matches('input,select,textarea,button'))return;
    const campo=resolver();
    if(!campo || !campo.isConnected || campo.disabled || !campo.getClientRects().length)return;
    // No se abre ningún calendario o selector: el usuario decide cuándo abrirlo.
    campo.focus({preventScroll:true});
    const reducido=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    animando=!reducido;
    campo.scrollIntoView({block:'center',inline:'nearest',behavior:reducido?'auto':'smooth'});
    setTimeout(()=>{animando=false;},600); // El movimiento termina sin volver a centrar el campo.
    // Se reutiliza el efecto aprobado, sin introducir colores o estilos nuevos.
    if(!reducido){
      campo.classList.add('campo-entrada');
      setTimeout(()=>campo.classList.remove('campo-entrada'),450);
    }
  },100);
}
