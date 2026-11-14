import {notificar} from './notificaciones.js';
let retorno=null,resolver=null;
// Este diálogo reutiliza las clases del modal existente; no añade estilos ni modifica la paleta.
function contenedor() {
  let fondo=document.getElementById('modalGeneral');if(fondo)return fondo;
  fondo=document.createElement('div');fondo.id='modalGeneral';fondo.className='modal';fondo.setAttribute('role','dialog');fondo.setAttribute('aria-modal','true');fondo.setAttribute('aria-labelledby','tituloGeneral');fondo.hidden=true;
  const caja=document.createElement('div');caja.className='modal-caja';
  const titulo=document.createElement('h2');titulo.id='tituloGeneral';
  const contenido=document.createElement('div');contenido.id='contenidoGeneral';
  const acciones=document.createElement('div');acciones.className='acciones';acciones.id='accionesGeneral';caja.append(titulo,contenido,acciones);fondo.append(caja);document.body.append(fondo);
  fondo.addEventListener('keydown',evento=>{
    if(evento.key==='Escape'){evento.preventDefault();cerrar(false);}
    if(evento.key!=='Tab')return;
    const controles=[...fondo.querySelectorAll('button,input,select,a[href]')].filter(e=>!e.disabled&&e.getClientRects().length);
    const primero=controles[0],ultimo=controles.at(-1);
    if(evento.shiftKey&&document.activeElement===primero){evento.preventDefault();ultimo?.focus();}
    else if(!evento.shiftKey&&document.activeElement===ultimo){evento.preventDefault();primero?.focus();}
  });
  return fondo;
}
function cerrar(valor) {
  const fondo=contenedor();window.jQuery(fondo).hide();fondo.hidden=true;
  document.querySelector('main').inert=false;document.querySelector('header').inert=false;
  const anterior=resolver;resolver=null;anterior?.(valor);retorno?.focus();
}
// Las etiquetas y los textos se crean como nodos; nunca se usa HTML suministrado por el usuario.
export function mostrarDialogo(titulo,contenido,opciones=[{texto:'Cerrar',valor:true}]) {
  const fondo=contenedor();if(resolver)cerrar(false);retorno=document.activeElement;
  document.getElementById('tituloGeneral').textContent=titulo;
  const cuerpo=document.getElementById('contenidoGeneral');cuerpo.replaceChildren();
  if(typeof contenido==='string'){const p=document.createElement('p');p.textContent=contenido;cuerpo.append(p);}else cuerpo.append(contenido);
  const acciones=document.getElementById('accionesGeneral');acciones.replaceChildren();
  opciones.forEach((o,i)=>{const b=document.createElement('button');b.type='button';b.className='btn '+(i===opciones.length-1?'primario':'secundario');b.textContent=o.texto;b.addEventListener('click',()=>cerrar(o.valor));acciones.append(b);});
  document.querySelector('main').inert=true;document.querySelector('header').inert=true;
  fondo.hidden=false;window.jQuery(fondo).show();acciones.querySelector('button')?.focus();
  return new Promise(resolve=>resolver=resolve);
}
export function confirmar(texto) { return mostrarDialogo('Confirmar acción',texto,[{texto:'Cancelar',valor:false},{texto:'Confirmar',valor:true}]); }
// Permite extender el temporizador accesible antes de que transcurran los treinta segundos originales.
export function mensajeEstado(texto) {notificar(texto,{duracion:5000});}
