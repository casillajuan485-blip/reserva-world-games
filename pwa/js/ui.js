// Utilidades de presentación: no recalculan precios ni cambian las validaciones originales.
import {adaptarTeclado} from './teclado.js';
// Declara el dato o estado que necesitan las instrucciones siguientes.
const NS='http://www.w3.org/2000/svg';
// Declara el dato o estado que necesitan las instrucciones siguientes.
const grupos=new Map();
const observadores=[];
// Agrupa estas instrucciones en una función reutilizable con la responsabilidad indicada por su nombre.
function paginador(id,control,limite=3){
  // Declara el dato o estado que necesitan las instrucciones siguientes.
  const lista=document.getElementById(id),barra=document.getElementById(control);
  // Devuelve este resultado o detiene la ejecución cuando se cumple la condición indicada.
  if(!lista||!barra)return;
  // Declara el dato o estado que necesitan las instrucciones siguientes.
  const estado={pagina:0}; grupos.set(id,estado);
  // Agrupa estas instrucciones en una función reutilizable con la responsabilidad indicada por su nombre.
  function pintar(){
    // Declara el dato o estado que necesitan las instrucciones siguientes.
    const hijos=[...lista.children];
    // Declara el dato o estado que necesitan las instrucciones siguientes.
    const capacidad=window.innerHeight<740?Math.min(limite,2):limite;
    const total=Math.max(1,Math.ceil(hijos.length/capacidad));
    // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
    estado.pagina=Math.min(estado.pagina,total-1);
    // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
    hijos.forEach((e,i)=>e.hidden=i<estado.pagina*capacidad||i>=(estado.pagina+1)*capacidad);
    // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
    barra.replaceChildren(); barra.hidden=hijos.length<=capacidad;
    // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
    for(const [texto,cambio] of [['←',-1],['→',1]]){
      // Declara el dato o estado que necesitan las instrucciones siguientes.
      const boton=document.createElement('button');boton.type='button';boton.className='btn secundario';
      // Muestra texto sin ejecutarlo como HTML; protege el contenido frente a etiquetas inyectadas.
      boton.textContent=texto;boton.setAttribute('aria-label',cambio<0?'Página anterior':'Página siguiente');
      // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
      boton.disabled=cambio<0?estado.pagina===0:estado.pagina===total-1;
      // Responde al evento indicado para atender la interacción del usuario o del navegador.
      boton.addEventListener('click',()=>{estado.pagina+=cambio;pintar();});barra.append(boton);
      // Muestra texto sin ejecutarlo como HTML; protege el contenido frente a etiquetas inyectadas.
      if(cambio<0){const texto=document.createElement('span');texto.textContent=`${estado.pagina+1} / ${total}`;barra.append(texto);}
    // Finaliza el ámbito de las instrucciones anteriores.
    }
  // Finaliza el ámbito de las instrucciones anteriores.
  }
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  const observador=new MutationObserver(pintar);observador.observe(lista,{childList:true});observadores.push({observador,lista,pintar});pintar();
// Finaliza el ámbito de las instrucciones anteriores.
}
// Sustituye las fuentes de iconos externas por SVG locales sin insertar HTML no confiable.
// Agrupa estas instrucciones en una función reutilizable con la responsabilidad indicada por su nombre.
function iconos(){
 // Declara el dato o estado que necesitan las instrucciones siguientes.
 const equivalencias={'bi-controller':'game','bi-calendar-check':'calendar','bi-calendar-plus':'calendar','bi-cup-straw':'snack','bi-basket':'cart','bi-gift':'gift','bi-info-circle':'info','bi-pc-display':'pc','bi-display':'pc','bi-arrow-right':'arrow','bi-chevron-right':'chevron'};
 // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
 document.querySelectorAll('i.bi').forEach(i=>{
  // Declara el dato o estado que necesitan las instrucciones siguientes.
  const nombre=Object.keys(equivalencias).find(c=>i.classList.contains(c));
  // Declara el dato o estado que necesitan las instrucciones siguientes.
  const svg=document.createElementNS(NS,'svg');svg.classList.add('icono');svg.setAttribute('aria-hidden','true');
  // Declara el dato o estado que necesitan las instrucciones siguientes.
  const use=document.createElementNS(NS,'use');use.setAttribute('href','./imagenes/iconos.svg#'+(equivalencias[nombre]||'game'));svg.append(use);i.replaceWith(svg);
 // Finaliza el ámbito de las instrucciones anteriores.
 });
// Finaliza el ámbito de las instrucciones anteriores.
}
// Agrupa estas instrucciones en una función reutilizable con la responsabilidad indicada por su nombre.
export function iniciarInterfaz(){
 // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
 document.querySelector('.carrito-movil').setAttribute('aria-label','Abrir mi carrito');
 // Muestra texto sin ejecutarlo como HTML; protege el contenido frente a etiquetas inyectadas.
 document.querySelectorAll('.progreso-reserva li').forEach(li=>li.textContent=li.textContent.replace(/^\d\.\s*/,''));
 // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
 iconos();
 // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
 paginador('listaCarrito','pagCarrito',3);paginador('catalogoSnackReserva','pagExtras',2);
 // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
 paginador('listaHistorial','pagHistorial',3);paginador('bitacora','pagBitacora',2);
 // Declara el dato o estado que necesitan las instrucciones siguientes.
 const unidades=document.getElementById('unidadesDisponibles');
 // Declara el dato o estado que necesitan las instrucciones siguientes.
 const barra=document.createElement('div');barra.id='pagUnidades';barra.className='paginacion';unidades.after(barra);
 // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
 paginador('unidadesDisponibles','pagUnidades',3);
 // Declara el dato o estado que necesitan las instrucciones siguientes.
 const contador=()=>{const cantidad=document.getElementById('cantidadCarrito');if(cantidad)cantidad.textContent=String([...document.querySelectorAll('#listaCarrito .controles-cantidad strong')].reduce((s,e)=>s+(Number(e.textContent)||0),0));};
 // Responde al evento indicado para atender la interacción del usuario o del navegador.
 window.addEventListener('wg:carrito',contador);contador();
 // Responde al evento indicado para atender la interacción del usuario o del navegador.
 window.addEventListener('wg:vista',()=>{
  // Declara el dato o estado que necesitan las instrucciones siguientes.
  const actual=document.body.dataset.pantalla;
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  document.querySelectorAll('.nav-link').forEach(b=>{
    // Declara el dato o estado que necesitan las instrucciones siguientes.
    const activo=b.dataset.vista===actual||(['carrito','reservar'].includes(actual)&&b.dataset.vista===(actual==='carrito'?'snacks':'historial'))||(['info','horarios','contactos','promos'].includes(actual)&&b.dataset.vista==='mas');
    // Comprueba la condición antes de continuar con esta rama de la operación.
    b.classList.toggle('activo',activo);if(activo)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  // Finaliza el ámbito de las instrucciones anteriores.
  });iconos();
 // Finaliza el ámbito de las instrucciones anteriores.
 });
 // El zoom táctil no deja atrapado el foco dentro de una pantalla recortada.
 // Declara el dato o estado que necesitan las instrucciones siguientes.
 const zoom=()=>document.body.classList.toggle('modo-accesible',(window.visualViewport?.scale||1)>1.2);
 // Responde al evento indicado para atender la interacción del usuario o del navegador.
 window.visualViewport?.addEventListener('resize',()=>{zoom();adaptarTeclado();});
 window.addEventListener('resize',adaptarTeclado);
 document.addEventListener('focusin',adaptarTeclado);document.addEventListener('focusout',()=>requestAnimationFrame(adaptarTeclado));zoom();adaptarTeclado();
 window.addEventListener('resize',()=>observadores.forEach(o=>o.pintar()));
 window.addEventListener('pagehide',()=>observadores.forEach(o=>o.observador.disconnect()));
 window.addEventListener('pageshow',()=>observadores.forEach(o=>{o.observador.observe(o.lista,{childList:true});o.pintar();}));
// Finaliza el ámbito de las instrucciones anteriores.
}
