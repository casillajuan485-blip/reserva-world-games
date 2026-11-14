// Se distingue el teclado superpuesto de un zoom: solo se ajusta el área de edición cuando disminuye la altura visible.
export function tecladoSuperpuesto(altoVisible,altoVentana,escala,editando) {
 return Boolean(editando&&escala<=1.2&&altoVentana-altoVisible>140);
}
// Los cambios temporales de tamaño se retiran al cerrar el teclado; no modifican los archivos CSS ni la paleta.
export function adaptarTeclado() {
 const viewport=window.visualViewport;if(!viewport)return;
 const campo=document.activeElement;
 const editando=campo?.matches('input[type=text],input[type=email],input[type=tel],input[type=search],textarea');
 const abierto=tecladoSuperpuesto(viewport.height,window.innerHeight,viewport.scale,editando);
 const main=document.querySelector('main'),menu=document.getElementById('menu');
 if(abierto){
  main.style.height=Math.round(viewport.height)+'px';main.style.paddingBottom='12px';menu.style.setProperty('display','none','important');
  requestAnimationFrame(()=>campo.scrollIntoView({block:'nearest',behavior:'auto'}));
 }else{main.style.removeProperty('height');main.style.removeProperty('padding-bottom');menu.style.removeProperty('display');}
}
