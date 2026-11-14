// Se distingue el teclado superpuesto de un zoom: solo se ajusta el área de edición cuando disminuye la altura visible.
export function tecladoSuperpuesto(altoVisible,altoVentana,escala,editando,altoAnterior=altoVentana) {
 return Boolean(editando&&escala<=1.2&&(Math.max(altoVentana,altoAnterior)-altoVisible>140||altoVisible<500));
}
const referencias=new Map();let campoAnterior=null;
// La página se desplaza completa al escribir; no se comprime el formulario en una franja.
export function adaptarTeclado() {
 const viewport=window.visualViewport,alto=viewport?.height||window.innerHeight,escala=viewport?.scale||1;
 const campo=document.activeElement;
 const editando=Boolean(campo?.matches('input[type=text],input[type=email],input[type=tel],input[type=search],textarea'));
 const clave=Math.round(window.innerWidth/50),previo=document.body.classList.contains('teclado-activo');
 if(!editando&&!previo)referencias.set(clave,Math.max(alto,referencias.get(clave)||0));
 const referencia=referencias.get(clave)||window.innerHeight;
 const abierto=tecladoSuperpuesto(alto,window.innerHeight,escala,editando,referencia)||Boolean(previo&&!editando&&escala<=1.2&&referencia-alto>140);
 document.documentElement.classList.toggle('teclado-activo',abierto);document.body.classList.toggle('teclado-activo',abierto);
 const main=document.querySelector('main'),menu=document.getElementById('menu');
 // Retira la solución anterior que encerraba el campo en una altura insuficiente.
 main?.style.removeProperty('height');main?.style.removeProperty('padding-bottom');menu?.style.removeProperty('display');
 if(previo!==abierto)window.dispatchEvent(new CustomEvent('wg:teclado',{detail:{abierto}}));
 // Solo se centra al entrar en un campo nuevo, nunca durante un desplazamiento manual.
 if(abierto&&editando&&(campo!==campoAnterior||!previo))requestAnimationFrame(()=>campo.scrollIntoView({block:'nearest',behavior:'auto'}));
 campoAnterior=editando?campo:null;
}
