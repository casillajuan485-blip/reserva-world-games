import { textoSeguro, palabraBloqueada, insertarPlantilla } from './seguridad-formularios.js';
import { mostrarReservaGuardada } from './avisos-aplicacion.js';
import './jquery.js';
import { a as aplazar, n as notificar, d as debounce, r as relojVisible } from './notificaciones.js';
import { promociones, equipos, productos, catalogoRecuperado } from './carga-catalogos.js';
import { m as mensajeEstado, a as mostrarDialogo, c as confirmar } from './dialogos.js';
import { c as cargarEstado, p as preferencias, g as guardarEstado, a as cerrarAlmacenamiento } from './almacenamiento.js';
import { l as leerLocal, e as escribirLocal, q as quitarLocal } from './persistencia-segura.js';

// Se reactiva una sola vez al abrir esta actualización; recargar no prolonga los tres días.
const CAMPANA='world-games-reactivada-2026-11-13-72h';
function activarCampana(anterior,ahora=Date.now()) {
 if(anterior?.campana===CAMPANA&&Number.isFinite(anterior.inicio)&&anterior.inicio>0)return anterior;
 return {campana:CAMPANA,inicio:ahora};
}

// Actualiza colecciones por identidad: conserva el foco y evita recrear filas que no cambiaron.
function reconciliar(lista,items,clave,crear,actualizar) {
  if(!lista)return;
  // Solo se reconocen nodos creados por esta función; un mensaje vacío no es una fila de datos.
  const anteriores=new Map([...lista.children].filter(n=>n.dataset.clave!==undefined).map(n=>[n.dataset.clave,n]));
  const vigentes=new Set(items.map(item=>String(clave(item))));
  for(const nodo of [...lista.children])if(!vigentes.has(nodo.dataset.clave))nodo.remove();
  let posicion=lista.firstElementChild;
  for(const item of items){
    const id=String(clave(item));
    const nodo=anteriores.get(id)||crear(item);
    nodo.dataset.clave=id;
    actualizar(nodo,item); // Cantidad, precio y disponibilidad se actualizan sin reemplazar controles.
    if(nodo!==posicion)lista.insertBefore(nodo,posicion);
    posicion=nodo.nextElementSibling;
  }
}
// Evita escrituras redundantes que dispararían observadores o trabajo de presentación innecesario.
function textoSiCambio(nodo,texto) {
  if(nodo && nodo.textContent!==String(texto))nodo.textContent=String(texto);
}

// El modo horizontal solo cambia el desplazamiento de la reserva en móviles y tabletas.
function esHorizontalMovil(ancho,alto,tactil=false) {
  return ancho>alto && (ancho<=1024 || tactil);
}
// Cada gesto invalida los avances pendientes: el usuario siempre conserva el control.
let revision=0;
let temporizador;
let inicializada=false;
let animando=false; // Solo se interrumpe un movimiento iniciado por la guía, nunca el desplazamiento libre.
const efectos=new Map(); // Conserva solo los efectos de entrada que todavía no han terminado.
// Se actualiza la clase al girar el teléfono o cambiar de pantalla, sin mover el foco.
function actualizarHorizontal() {
  const activo=document.body.dataset.pantalla==='reservar' && esHorizontalMovil(window.innerWidth,window.innerHeight,window.matchMedia('(pointer: coarse)').matches);
  document.documentElement.classList.toggle('reserva-horizontal',activo);
  document.body.classList.toggle('reserva-horizontal',activo);
  return activo;
}
// Los eventos son pasivos: nunca cancelan el desplazamiento natural con el dedo.
function iniciarGuiaHorizontal() {
  if(inicializada)return;
  inicializada=true;
  const cancelar=()=>{
    revision++;
    clearTimeout(temporizador);
    for(const [timer,limpiar] of efectos){clearTimeout(timer);limpiar();}
    efectos.clear();animando=false;
  };
  const interrumpir=()=>{
    const estabaAnimando=animando;
    cancelar();
    // Detiene únicamente la animación en curso; el gesto continúa desplazando el documento.
    if(estabaAnimando && document.body.classList.contains('reserva-horizontal')){
      window.scrollTo({top:window.scrollY,left:window.scrollX,behavior:'instant'});
      animando=false;
    }
  };
  document.addEventListener('pointerdown',cancelar,{passive:true});
  document.addEventListener('touchmove',interrumpir,{passive:true});
  document.addEventListener('wheel',interrumpir,{passive:true});
  window.addEventListener('resize',()=>{cancelar();actualizarHorizontal();});
  window.addEventListener('wg:vista',()=>{cancelar();actualizarHorizontal();});
  window.addEventListener('pagehide',cancelar); // No deja efectos ni nodos retenidos al salir.
  actualizarHorizontal();
}
// Espera a que los modelos, disponibilidad y validaciones terminen de actualizarse.
// El destino se calcula al ejecutar el avance, para no enfocar una máquina que ya no esté libre.
function guiarHorizontal(resolver,origen=null) {
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
    const fin=setTimeout(()=>{animando=false;efectos.delete(fin);},600);
    efectos.set(fin,()=>{animando=false;}); // El movimiento termina sin volver a centrar el campo.
    // Se reutiliza el efecto aprobado, sin introducir colores o estilos nuevos.
    if(!reducido){
      campo.classList.add('campo-entrada');
      const limpiar=()=>campo.classList.remove('campo-entrada');
      const efecto=setTimeout(()=>{limpiar();efectos.delete(efecto);},450);efectos.set(efecto,limpiar);
    }
  },100);
}

let registro=null,recargando=false,teniaControl=Boolean(navigator.serviceWorker?.controller);
let eventos$1=null; // Un controlador por ciclo de página permite retirar todos los eventos juntos.
// El trabajador actualizado solo reemplaza al anterior después de que el usuario lo acepte.
async function buscarActualizacion() {
 if(!registro){await mostrarDialogo('Actualización','La instalación offline todavía no está disponible en este navegador.');return;}
 try {
  await registro.update();
  if(registro.waiting&&await confirmar('Hay una versión nueva. ¿Actualizar y recargar WORLD GAMES?'))registro.waiting.postMessage({tipo:'ACTIVAR'});
  else if(!registro.waiting)mensajeEstado('Se comprobó la versión. No hay una actualización lista.');
 }catch{mensajeEstado('No se pudo buscar una actualización. Conservamos la versión disponible sin conexión.');}
}
function iniciarPWA() {
 if(eventos$1)return; // El regreso desde caché no duplica los manejadores de conexión o instalación.
 eventos$1=new AbortController();const signal=eventos$1.signal;
 const estado=document.getElementById('conexion');
 const conexion=()=>{estado.textContent=navigator.onLine?'● En línea':'○ Sin conexión';estado.style.color=navigator.onLine?'#51ff9a':'#ffcc77';};
 window.addEventListener('online',conexion,{signal});window.addEventListener('offline',conexion,{signal});conexion();
 if('serviceWorker'in navigator){
  navigator.serviceWorker.register('./sw.js').then(r=>{
   registro=r;
   const avisar=()=>{if(r.waiting)mensajeEstado('Actualización disponible. Abre Más → Ajustes para instalarla.');};
   avisar();r.addEventListener('updatefound',()=>{const worker=r.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)avisar();},{signal});},{signal});
  }).catch(()=>mensajeEstado('El navegador no pudo activar el modo offline. La página sigue disponible en línea.'));
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!teniaControl){teniaControl=true;return;}if(!recargando){recargando=true;location.reload();}},{signal});
 }
 window.addEventListener('pagehide',()=>{
  eventos$1?.abort();eventos$1=null;
 },{once:true});
}
window.addEventListener('pageshow',()=>{if(!eventos$1)iniciarPWA();});

// Horarios publicados en la página original: lunes-sábado 10–22, domingo 14–20.
function horarioDelDia(fecha=new Date()) { return fecha.getDay()===0?{apertura:14*60,cierre:20*60}:{apertura:10*60,cierre:22*60}; }
// El fin puede coincidir con el cierre, pero una reserva nunca puede comenzar antes de abrir ni terminar después.
function dentroHorario(inicio,fin) {
  if(!(inicio instanceof Date)||!(fin instanceof Date)||!Number.isFinite(+inicio)||!Number.isFinite(+fin)||fin<=inicio)return false;
  if(inicio.getFullYear()!==fin.getFullYear()||inicio.getMonth()!==fin.getMonth()||inicio.getDate()!==fin.getDate())return false;
  const h=horarioDelDia(inicio),a=inicio.getHours()*60+inicio.getMinutes(),b=fin.getHours()*60+fin.getMinutes();
  return a>=h.apertura&&b<=h.cierre;
}
// La indicación abierto/cerrado se calcula con el mismo horario utilizado para validar las reservas.
function estadoHorario(ahora=new Date()) {
  const h=horarioDelDia(ahora),m=ahora.getHours()*60+ahora.getMinutes();
  return {abierto:m>=h.apertura&&m<h.cierre,...h};
}
function horaTexto(minutos) { return String(Math.floor(minutos/60)).padStart(2,'0')+':'+String(minutos%60).padStart(2,'0'); }

// Reglas compartidas para comprobar formularios sin interpretar contenido HTML.
const letras=/^[\p{L}]+(?:[ '\-][\p{L}]+)*$/u;
const correo=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validarIdentidad({nombre,apellido,email,telefono}) {
 return {nombre:nombre.length>=2&&nombre.length<=50&&letras.test(nombre)&&!palabraBloqueada(nombre)&&textoSeguro(nombre)===nombre.normalize("NFC"),apellido:apellido.length>=2&&apellido.length<=60&&letras.test(apellido)&&!palabraBloqueada(apellido)&&textoSeguro(apellido)===apellido.normalize("NFC"),correo:email.length<=100&&correo.test(email)&&!/["'<>]/.test(email)&&textoSeguro(email)===email.normalize("NFC"),telefono:/^[67]\d{7}$/.test(telefono)};
}

// Los cálculos puros no acceden al DOM ni al almacenamiento y se pueden comprobar de forma aislada.
function costoMinutos(precioHora,minutos){return Math.round(precioHora*100*minutos/60);}
function textoDuracion(minutos){const h=Math.floor(minutos/60),m=minutos%60;return (h?h+' h ':'')+(m?m+' min':'');}
// El descuento de una promoción no puede dejar el importe final por debajo de cero.
function totalPedido(juego,snacks,descuento){return Math.max(0,juego+snacks-descuento);}

// Se distingue el teclado superpuesto de un zoom: solo se ajusta el área de edición cuando disminuye la altura visible.
function tecladoSuperpuesto(altoVisible,altoVentana,escala,editando,altoAnterior=altoVentana) {
 return Boolean(editando&&escala<=1.2&&(Math.max(altoVentana,altoAnterior)-altoVisible>140||altoVisible<500));
}
const referencias$1=new Map();let campoAnterior=null;
// La página se desplaza completa al escribir; no se comprime el formulario en una franja.
function adaptarTeclado() {
 const viewport=window.visualViewport,alto=viewport?.height||window.innerHeight,escala=viewport?.scale||1;
 const campo=document.activeElement;
 const editando=Boolean(campo?.matches('input[type=text],input[type=email],input[type=tel],input[type=search],textarea'));
 const clave=Math.round(window.innerWidth/50),previo=document.body.classList.contains('teclado-activo');
 if(!editando&&!previo)referencias$1.set(clave,Math.max(alto,referencias$1.get(clave)||0));
 const referencia=referencias$1.get(clave)||window.innerHeight;
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

// Solo los textos que realmente desbordan reciben puntos suspensivos; los textos actuales se conservan.
const selector='.tarjeta h3,.item-carrito>div:first-child>strong,.snack-fila>div>strong,#listaHistorial h2';
let cuadro=null,observador=null;
const referencias=new Set();
function revisar(){
  cuadro=null;
  document.querySelectorAll(selector).forEach(elemento=>{
    if(!elemento.getClientRects().length)return;
    elemento.classList.remove('texto-ajustado');
    const alto=parseFloat(getComputedStyle(elemento).lineHeight)||20;
    const largo=elemento.scrollWidth>elemento.clientWidth+1 || elemento.getBoundingClientRect().height>alto*2.1;
    elemento.classList.toggle('texto-ajustado',largo);
    if(largo){
      elemento.title=elemento.textContent.trim(); // El texto completo permanece también en el DOM.
      if(!elemento.closest('button,a,[role=button]')){
        elemento.tabIndex=0;elemento.setAttribute('role','button');
        elemento.setAttribute('aria-label',elemento.textContent.trim()+'. Ver texto completo');
        referencias.add(elemento);
      }
    }else if(referencias.has(elemento)){
      elemento.removeAttribute('tabindex');elemento.removeAttribute('role');elemento.removeAttribute('aria-label');
      elemento.removeAttribute('title');referencias.delete(elemento);
    }
  });
  // Los nodos retirados del carrito no quedan retenidos en memoria.
  for(const elemento of referencias)if(!elemento.isConnected)referencias.delete(elemento);
}
function programar(){if(cuadro===null)cuadro=requestAnimationFrame(revisar);}
function abrir(evento){
  const elemento=evento.target.closest?.('.texto-ajustado');
  if(!elemento || !referencias.has(elemento))return;
  if(evento.type==='keydown'&&!['Enter',' '].includes(evento.key))return;
  evento.preventDefault();evento.stopPropagation();
  const tarjeta=elemento.closest('.tarjeta,.item-carrito,.snack-fila');
  mostrarDialogo('Texto completo',tarjeta?.textContent.trim()||elemento.textContent.trim());
}
// Se observa una sola vez y se desconecta al abandonar la página; el regreso desde caché la reactiva.
function iniciarTextos(){
  const conectar=()=>{
    observador??=new MutationObserver(cambios=>{
      if(cambios.some(c=>c.type==='attributes'||c.target.parentElement?.closest('.tarjeta,.item-carrito,.snack-fila,#listaHistorial')||c.type==='childList'))programar();
    });
    observador.observe(document.querySelector('main'),{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden']});
    programar();
  };
  const parar=()=>{observador?.disconnect();if(cuadro!==null)cancelAnimationFrame(cuadro);cuadro=null;referencias.clear();};
  document.addEventListener('click',abrir);document.addEventListener('keydown',abrir);
  window.addEventListener('resize',programar);window.addEventListener('wg:vista',programar);
  window.addEventListener('pagehide',parar);window.addEventListener('pageshow',conectar);conectar();
}

// Utilidades de presentación: no recalculan precios ni cambian las validaciones originales.
// Declara el dato o estado que necesitan las instrucciones siguientes.
const NS='http://www.w3.org/2000/svg';
// Declara el dato o estado que necesitan las instrucciones siguientes.
const grupos=new Map();
const observadores=[];
// Agrupa estas instrucciones en una función reutilizable con la responsabilidad indicada por su nombre.
function paginador(id,control,limite=3){
  const lista=document.getElementById(id),barra=document.getElementById(control);
  if(!lista||!barra)return;
  const estado={pagina:0};grupos.set(id,estado);
  // Los tres controles se crean una vez: paginar no elimina el botón que tiene el foco.
  const anterior=document.createElement('button'),siguiente=document.createElement('button'),texto=document.createElement('span');
  for(const [boton,etiqueta,dibujo] of [[anterior,'Página anterior','←'],[siguiente,'Página siguiente','→']]){
    boton.type='button';boton.className='btn secundario';boton.textContent=dibujo;boton.setAttribute('aria-label',etiqueta);
  }
  barra.replaceChildren(anterior,texto,siguiente);
  function pintar(){
    const hijos=[...lista.children],capacidad=window.innerHeight<740?Math.min(limite,2):limite;
    const total=Math.max(1,Math.ceil(hijos.length/capacidad));
    estado.pagina=Math.min(estado.pagina,total-1);
    hijos.forEach((e,i)=>{const oculto=i<estado.pagina*capacidad||i>=(estado.pagina+1)*capacidad;if(e.hidden!==oculto)e.hidden=oculto;});
    barra.hidden=hijos.length<=capacidad;
    anterior.disabled=estado.pagina===0;siguiente.disabled=estado.pagina===total-1;
    const etiqueta=(estado.pagina+1)+' / '+total;if(texto.textContent!==etiqueta)texto.textContent=etiqueta;
  }
  anterior.dataset.pasoPagina='-1'; siguiente.dataset.pasoPagina='1';
  const selector='button[data-paso-pagina]';
  $(barra).off('click.wgPaginador',selector).on('click.wgPaginador',selector,function(){
    estado.pagina+=Number(this.dataset.pasoPagina);
    pintar();
  });
  const observador=new MutationObserver(pintar);
  // La pantalla oculta no mantiene un observador activo; al regresar se recalcula desde sus datos actuales.
  const sincronizar=()=>{observador.disconnect();if(lista.closest('.vista')?.hidden)return;observador.observe(lista,{childList:true});pintar();};
  observadores.push({observador,lista,pintar,sincronizar});sincronizar();
}
// Sustituye las fuentes de iconos externas por SVG locales sin insertar HTML no confiable.
// Agrupa estas instrucciones en una función reutilizable con la responsabilidad indicada por su nombre.
function iconos(){
 // Declara el dato o estado que necesitan las instrucciones siguientes.
 const equivalencias={"bi-facebook":"facebook","bi-instagram":"instagram","bi-tiktok":"tiktok","bi-whatsapp":"whatsapp","bi-list":"menu","bi-joystick":"joystick","bi-globe":"globe",'bi-controller':'game','bi-calendar-check':'calendar','bi-calendar-plus':'calendar','bi-cup-straw':'snack','bi-basket':'cart','bi-gift':'gift','bi-info-circle':'info','bi-pc-display':'pc','bi-display':'pc','bi-arrow-right':'arrow','bi-chevron-right':'chevron'};
 // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
 document.querySelectorAll('i.bi').forEach(i=>{
  // Declara el dato o estado que necesitan las instrucciones siguientes.
  const nombre=Object.keys(equivalencias).find(c=>i.classList.contains(c));
  if (!nombre) return;
  // Declara el dato o estado que necesitan las instrucciones siguientes.
  const svg=document.createElementNS(NS,'svg');svg.classList.add('icono');svg.setAttribute('aria-hidden','true');
  // Declara el dato o estado que necesitan las instrucciones siguientes.
  const use=document.createElementNS(NS,'use');use.setAttribute('href','./imagenes/iconos.svg#'+equivalencias[nombre]);svg.append(use);i.replaceWith(svg);
 // Finaliza el ámbito de las instrucciones anteriores.
 });
// Finaliza el ámbito de las instrucciones anteriores.
}
// Agrupa estas instrucciones en una función reutilizable con la responsabilidad indicada por su nombre.
function iniciarInterfaz(){
 iniciarTextos(); // Solo actúa sobre desbordamientos; no sustituye los textos ni la paleta.
 iniciarGuiaHorizontal(); // Habilita el recorrido y el desplazamiento libre solo en reservas horizontales.
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
  });iconos();observadores.forEach(o=>o.sincronizar());
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
 window.addEventListener('pageshow',()=>observadores.forEach(o=>o.sincronizar()));
// Finaliza el ámbito de las instrucciones anteriores.
}

const $ = window.jQuery;
// Se recuperan las reservas antes de habilitar el asistente.
const estadoInicial = await cargarEstado();

// =====================================================
// WORLD GAMES - JAVASCRIPT + JQUERY
// Proyecto 100 % frontend
// =====================================================

// =====================================================
// 1. DATOS DE EQUIPOS
// =====================================================
// Cada modelo tiene unidades individuales con códigos.
// Los precios están expresados en bolivianos por hora.



// =====================================================
// 2. SNACKS Y STOCK
// =====================================================
// Los combos tienen inventario propio.
// La gaseosa tiene tres sabores demostrativos.



// =====================================================
// 3. PROMOCIONES
// =====================================================
// La rebaja es de Bs 5 sobre el precio normal.
// Solo se aplica cuando se selecciona una promoción.
// Un equipo por paquete: las gaseosas se agregan automáticamente.
// En esta campaña, las cuatro promociones duran tres días (72 horas).



// =====================================================
// 4. CARRUSEL PRINCIPAL
// =====================================================



// =====================================================
// 5. LOCALSTORAGE
// =====================================================
// Guarda datos solo en este navegador.
// NO sincroniza reservas entre dispositivos.

function leerArray(clave) {
  try {
    const dato = leerLocal(clave,[]);
    return Array.isArray(dato) ? dato : [];
  } catch {
    return [];
  }
}

// Las reservas y ventas se recuperan de IndexedDB y se conservan entre sesiones del navegador.
let reservas = estadoInicial.reservas;
let ventas = estadoInicial.ventas;


let carrito = estadoInicial.carrito;
let eventos = leerArray("wg2_eventos").filter(e=>e&&typeof e.fecha==="string"&&typeof e.mensaje==="string").slice(0,100);

// La fecha de activación de ofertas se guarda una vez.
// Así no se reinicia al recargar la página.
const campana=activarCampana(leerLocal('wg_campana_promos',null));
const inicioPromos=campana.inicio;
escribirLocal('wg_campana_promos',campana);
escribirLocal('wg2_inicio_promos',inicioPromos);

// IndexedDB es ahora el almacenamiento principal; la función devuelve el resultado de la escritura.
function guardar() {
  pintarHistorial();
  return guardarEstado({reservas,ventas,carrito});
}

// =====================================================
// 6. ESTADO DE LA APLICACIÓN
// =====================================================

let unidadElegida = null;
let segundaUnidad = null;
let promoActiva = null;
let promoPorRecuperar = preferencias().recordarPromocion ? leerLocal("wg_promocion",null) : null;
let pendiente = null;
let timerModal = null;
let venceModal = 0;
let toastTimer = null;


let focoAnterior = null;

// =====================================================
// 7. FUNCIONES GENERALES
// =====================================================

const buscarEquipo = id => equipos.find(e => e.id === id);
const buscarProducto = id => productos.find(p => p.id === Number(id));
const moneda = n => "Bs " + Number(n).toFixed(2);

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;",
    '"':"&quot;", "'":"&#39;"
  })[c]);
}

function fechaLocal(fecha = new Date()) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function codigos(modelo) {
  return Array.from({length:modelo.cantidad}, (_,i) =>
    modelo.id.toUpperCase() + "-" + String(i+1).padStart(2,"0")
  );
}



// Precios calculados en centavos para evitar
// errores típicos de números decimales.


function stockDisponible(p) {
  const vendido = ventas
    .filter(v => v.id === p.id)
    .reduce((s,v) => s + v.cantidad, 0);
  return Math.max(0, p.stock - vendido);
}

function cantidadCarrito(id) {
  return carrito.find(x => x.id === id)?.cantidad || 0;
}

// =====================================================
// 8. HORARIOS Y SOLAPAMIENTOS
// =====================================================

function fechaReservaCorrecta(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [y,m,d] = texto.split("-").map(Number);
  const fecha = new Date(y,m-1,d);
  return fecha.getFullYear()===y && fecha.getMonth()===m-1 && fecha.getDate()===d && y===new Date().getFullYear() && texto>=fechaLocal();
}

function horaReservaCorrecta(fecha,hora) {
  if (!fechaReservaCorrecta(fecha) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return false;
  return new Date(fecha+"T"+hora)>new Date();
}

function intervaloActual() {
  const fecha = $("#fechaReserva").val();
  const hora = $("#horaReserva").val();
  const minutos = Number($("#duracionReserva").val());

  if (!horaReservaCorrecta(fecha,hora) || !Number.isInteger(minutos) ||
      minutos < 10 || minutos > 480 || minutos % 10 !== 0) return null;

  const inicio = new Date(`${fecha}T${hora}`);
  if (Number.isNaN(inicio.getTime())) return null;

  return {
    inicio,
    fin: new Date(inicio.getTime() + minutos * 60000),
    minutos
  };
}

function horarioValido(i) {
  return Boolean(
    i &&
    i.inicio > new Date() &&
    dentroHorario(i.inicio,i.fin) &&
    fechaLocal(i.inicio) ===
    fechaLocal(new Date(i.fin.getTime() - 1))
  );
}

// Una unidad está ocupada si hay una reserva
// que se superpone con el horario elegido.
function libre(codigo, intervalo) {
  if (!intervalo) return false;

  return !reservas.some(r =>
    (r.unidades || [r.unidad]).includes(codigo) &&
    intervalo.inicio < new Date(r.fin) &&
    intervalo.fin > new Date(r.inicio)
  );
}

// =====================================================
// 9. PROMOCIONES Y VENCIMIENTO
// =====================================================

function conteoUnidades(modelo, intervalo = null) {
  const ocupadas = codigos(modelo).filter(codigo => intervalo
    ? !libre(codigo,intervalo)
    : reservas.some(r=>(r.unidades||[r.unidad]).includes(codigo) && new Date(r.fin)>new Date())
  ).length;
  return {libres:modelo.cantidad-ocupadas,ocupadas};
}

function vencimientoPromo(p) {
  return inicioPromos + p.dias * 24 * 60 * 60 * 1000;
}

function promoVigente(p) {
  return Date.now() < vencimientoPromo(p);
}

function tiempoPromo(p) {
  const ms = Math.max(0, vencimientoPromo(p) - Date.now());
  if (ms === 0) return "FINALIZADA";

  const dias = Math.floor(ms / 86400000);
  const horas = Math.floor(ms % 86400000 / 3600000);
  const min = Math.floor(ms % 3600000 / 60000);
  const seg = Math.floor(ms % 60000 / 1000);
  const dos = n => String(n).padStart(2,"0");

  return `${dias} ${dias===1?"día":"días"} · ${dos(horas)} h ${dos(min)} min ${dos(seg)} s`;
}

// =====================================================
// 10. INICIAR JQUERY
// Cada .off().on() retira únicamente su vínculo identificado y vuelve a conectarlo.
// Los eventos delegados conservan el selector: las tarjetas nuevas siguen respondiendo.
// Se evitan .off() globales que borrarían las acciones de otros módulos.
// =====================================================

$(function () {
  // Identifica la pantalla inicial antes de activar relojes y observadores de su ciclo de vida.
  document.body.dataset.pantalla='inicio';

  // Asistente: conserva las elecciones al retroceder y muestra una sola tarea.
  let pasoActual = 1;
  let asistenteIniciado = false;
  let decisionSnack = false;
  let ultimaGuia = "";
  const panelesPaso = ["#pasoEquipo", "#pasoSnacks", "#formReserva", "#pasoResumen"];

  // El acceso directo abre una nueva reserva; desde equipo/promoción se conserva el contexto seleccionado.
  function reiniciarReservaDirecta() {
    if (promoActiva) quitarPromocion(false);
    asistenteIniciado = false;
    unidadElegida = segundaUnidad = null;
    $("#formReserva")[0].reset();
    $("#nombreCliente, #apellidoCliente, #correoCliente, #telefonoCliente, #fechaReserva, #horaReserva").val("");
    $("#categoriaReserva").find("option[value='']").remove();
    $("#categoriaReserva").prepend(new Option("Elige una categoría", "")).val("");
    $("#modeloReserva").empty().append(new Option("Primero elige una categoría", ""));
    $("#duracionReserva").find("option[value='']").remove();
    $("#guia-horaReserva, #errorFormulario").text("");
    $("input[name=quiereSnack]").prop("checked",false);
    $("#snacksEnReserva").attr("hidden",true).hide();
    validarDatos();
  }

  // Horario comercial y última hora de inicio, teniendo en cuenta la duración seleccionada.
  function rangoHorario() {
    const fecha = $("#fechaReserva").val();
    if (!fechaReservaCorrecta(fecha)) return null;
    const { apertura, cierre } = horarioDelDia(new Date(fecha + "T12:00"));
    const duracion = Math.max(10, Number($("#duracionReserva").val()) || 10);
    const ahora = new Date();
    const primerTurno = fecha === fechaLocal(ahora) ? Math.max(apertura, (Math.floor((ahora.getHours()*60+ahora.getMinutes())/10)+1)*10) : apertura;
    const ultimoTurno = cierre - duracion;
    const rango = primerTurno <= ultimoTurno ? "Puedes iniciar entre " + horaTexto(primerTurno) + " y " + horaTexto(ultimoTurno) + "." : "No quedan turnos con esta duración. Elige otra fecha o reduce el tiempo.";
    return { primerTurno, ultimoTurno, mensaje:"WORLD GAMES atiende de " + horaTexto(apertura) + " a " + horaTexto(cierre) + ". " + rango };
  }

  function iniciarAsistente(origen = null) {
    if (!origen) reiniciarReservaDirecta();
    if (!asistenteIniciado) {
      $("#fechaReserva, #horaReserva").val("");
      if (!promoActiva && !$("#duracionReserva option[value='']").length) $("#duracionReserva").prepend('<option value="">Elige la duración</option>').val("");
      asistenteIniciado = true;
    }
    if (!origen && !promoActiva && !unidadElegida && !$("#categoriaReserva option[value='']").length) {
      $("#categoriaReserva").prepend('<option value="">Elige una categoría</option>').val("");
      $("#modeloReserva").html('<option value="">Primero elige una categoría</option>');
    }
    if (origen?.tipo === "promo") {
      if (!$("#categoriaReserva option[value='']").length) $("#categoriaReserva").prepend('<option value="">Elige una categoría</option>');
      $("#categoriaReserva").val("");
      $("#modeloReserva").html('<option value="">Primero elige una categoría</option>');
      unidadElegida=null;
    }
    decisionSnack = carrito.length > 0;
    if (!decisionSnack) $("input[name=quiereSnack]").prop("checked",false);
    let mensaje = "";
    if (origen?.tipo === "equipo") mensaje = "Seleccionaste " + origen.nombre + ". Ahora elige cuándo y cuánto tiempo quieres jugar.";
    else if (promoActiva) mensaje = "Elegiste " + promoActiva.nombre + ". " + promoActiva.descripcion + " La duración y la rebaja ya están aplicadas.";
    else if (carrito.length) mensaje = "Guardamos tus snacks. Primero elige equipo y horario; en el siguiente paso podrás revisar tu carrito.";
    $("#origenReserva").text(mensaje).prop("hidden",!mensaje);
    actualizarUnidades();
    mostrarPaso(1, false);
  }

  function guiaEquipo() {
    if (!$("#categoriaReserva").val()) return ["Selecciona la categoría que prefieres: PlayStation, Xbox, computadoras u otro servicio.","#categoriaReserva"];
    if (!buscarEquipo($("#modeloReserva").val())) return ["Selecciona el modelo de " + $("#categoriaReserva option:selected").text() + " que quieres reservar.","#modeloReserva"];
    if ($("#fechaReserva").prop("validity")?.badInput) return ["La fecha está incompleta o es incorrecta. Selecciona una fecha válida en el calendario.","#fechaReserva"];
    if (!$("#fechaReserva").val()) return ["¿Qué día vendrás? Selecciona la fecha de tu visita.","#fechaReserva"];
    if (!fechaReservaCorrecta($("#fechaReserva").val())) return ["Fecha incorrecta: elige desde hoy hasta el 31 de diciembre del año actual.","#fechaReserva"];
    if (!$("#horaReserva").val()) return [rangoHorario().mensaje,"#horaReserva"];
    if (!horaReservaCorrecta($("#fechaReserva").val(),$("#horaReserva").val())) return ["La hora no es válida o ya pasó. Elige una hora futura para tu visita.","#horaReserva"];
    const rango = rangoHorario();
    const [h,m] = $("#horaReserva").val().split(":").map(Number);
    if (h*60+m<rango.primerTurno || h*60+m>rango.ultimoTurno || m%10!==0) return ["Hora incorrecta. " + rango.mensaje + " Usa intervalos de 10 minutos.","#horaReserva"];
    if (!$("#duracionReserva").val()) return ["¿Cuánto tiempo quieres jugar? Selecciona la duración de tu sesión.","#duracionReserva"];
    const duracion = Number($("#duracionReserva").val());
    if (!Number.isInteger(duracion) || duracion<10 || duracion>480 || duracion%10!==0) return ["Elige una duración de 10 minutos a 8 horas, en intervalos de 10 minutos.","#duracionReserva"];
    if ($("#fechaReserva").val()<fechaLocal()) return ["Elige desde hoy hasta el 31 de diciembre del año actual.","#fechaReserva"];
    const i = intervaloActual();
    if (!horarioValido(i)) return ["Elige una fecha/hora futura dentro del horario comercial: lunes a sábado 10:00–22:00; domingo 14:00–20:00.","#horaReserva"];
    if (!unidadElegida || !libre(unidadElegida,i)) return ["¡Bien! Ahora pulsa una unidad libre para asignarla a tu reserva.","#unidadesDisponibles .unidad.libre:first"];
    if (promoActiva?.dosEstaciones && (!segundaUnidad || segundaUnidad===unidadElegida || !libre(segundaUnidad,i))) return ["Tu oferta incluye dos equipos. Elige también una segunda unidad libre.","#segundasUnidades .unidad.libre:first"];
    if (!codigos(buscarEquipo($("#modeloReserva").val())).includes(unidadElegida)) return ["Selecciona una unidad del modelo elegido.","#unidadesDisponibles .unidad.libre:first"];
    if (promoActiva && (!promoVigente(promoActiva) || i.minutos!==promoActiva.minutos)) return ["La promoción cambió o venció. Elige otra oferta o retírala para continuar.","#quitarPromo"];
    return ["¡Equipo y horario listos! Pulsa «Continuar a snacks».",null];
  }

  function guiaActual() {
    if (pasoActual===1) return guiaEquipo();
    if (pasoActual===2) {
      if (!decisionSnack) return [promoActiva ? "Tu promoción ya incluye sus snacks. ¿Quieres agregar algo más? Elige Sí o No, gracias." : "¿Te gustaría acompañar tu juego con un snack? Elige Sí o No, gracias.","input[name=quiereSnack]:first"];
      if ($("input[name=quiereSnack]:checked").val()==="si" && !carrito.length) return ["Elige lo que te apetezca y pulsa «+ Agregar», o marca «No, gracias» para seguir sin extras.","#catalogoSnackReserva .btn-agregar:not(:disabled):first"];
      if (promoActiva && !promoVigente(promoActiva)) return ["Esta promoción ha finalizado. Retírala o elige otra oferta antes de continuar.","#quitarPromo"];
      if (!validarStock(itemsPedido())) return ["Algún producto supera el stock disponible. Reduce su cantidad o cambia el snack de la promoción.","#carritoReserva"];
      return [promoActiva ? "Revisa los snacks de la oferta y tus extras. Cuando estés listo, continúa a tus datos." : "¡Listo! Puedes ajustar las cantidades o continuar a tus datos.",null];
    }
    if (pasoActual===3) {
      validarDatos();
      if (palabraBloqueada($("#nombreCliente").val())) return ["Usa un nombre apropiado.","#nombreCliente"];
      if (!letras.test($("#nombreCliente").val().trim()) || $("#nombreCliente").val().trim().length<2) return ["¿Cómo te llamas? Escribe tu nombre con al menos 2 letras, sin números.","#nombreCliente"];
      if (palabraBloqueada($("#apellidoCliente").val())) return ["Usa un apellido apropiado.","#apellidoCliente"];
      if (!letras.test($("#apellidoCliente").val().trim()) || $("#apellidoCliente").val().trim().length<2) return ["Ahora escribe tu apellido, usando al menos 2 letras y sin números.","#apellidoCliente"];
      if ($("#correoCliente").val().trim().length>100 || !correo.test($("#correoCliente").val().trim())) return ["Escribe tu correo completo. Por ejemplo: juan@correo.com.","#correoCliente"];
      if (!/^[67]\d{7}$/.test($("#telefonoCliente").val().trim())) return ["Por último, escribe tu celular: 8 números que comiencen con 6 o 7.","#telefonoCliente"];
      return ["¡Gracias! Tus datos están completos. Continúa para revisar tu pedido.",null];
    }
    return reservaLista() ? ["Todo está listo. Revisa tu pedido y pulsa «Revisar y confirmar». Si necesitas corregir algo, vuelve atrás.",null] : ["Revisa la reserva: el horario, la disponibilidad, el stock o la promoción han cambiado. Vuelve atrás para corregirlos.",null];
  }

  function actualizarGuia() {
    if (!asistenteIniciado) return;
    const categoriaValida = equipos.some(e=>e.categoria===$("#categoriaReserva").val());
    const modeloValido = Boolean(buscarEquipo($("#modeloReserva").val()));
    const fechaValida = fechaReservaCorrecta($("#fechaReserva").val());
    const rango = rangoHorario();
    const hora = $("#horaReserva").val();
    const horas = hora.split(":").map(Number);
    const minutos = horas[0]*60+horas[1];
    const horaValida = Boolean(rango && horaReservaCorrecta($("#fechaReserva").val(),hora) && minutos>=rango.primerTurno && minutos<=rango.ultimoTurno && minutos%10===0);
    textoSiCambio(document.getElementById("guia-horaReserva"),rango?.mensaje ?? "Elige una fecha para ver el rango. Lunes a sábado 10:00–22:00. Domingo 14:00–20:00.");
    if (rango && rango.primerTurno<=rango.ultimoTurno) $("#horaReserva").attr({min:horaTexto(rango.primerTurno),max:horaTexto(rango.ultimoTurno)});
    else $("#horaReserva").removeAttr("min max");
    $("#modeloReserva").prop("disabled",!categoriaValida);
    $("#fechaReserva").prop("disabled",!modeloValido);
    $("#horaReserva").prop("disabled",!modeloValido || !fechaValida);
    $("#duracionReserva").prop("disabled",Boolean(promoActiva) || !modeloValido || !horaReservaCorrecta($("#fechaReserva").val(),hora));
    $("#fechaReserva").attr("aria-invalid",Boolean($("#fechaReserva").val())&&!fechaValida ? "true":"false");
    $("#horaReserva").attr("aria-invalid",Boolean($("#horaReserva").val())&&!horaValida ? "true":"false");
    const [mensaje,selector] = guiaActual();
    const incluidos = itemsIncluidos().map(x=>x.cantidad+" × "+(buscarProducto(x.id)?.nombre||"snack")).join(", ");
    $("#snacksIncluidosGuia").text(promoActiva ? "Tu promoción incluye: "+incluidos+". Estos productos se mantienen aunque elijas no agregar extras." : "").prop("hidden",!promoActiva);
    const errorFecha = (Boolean($("#fechaReserva").val()) && !fechaValida) || Boolean($("#fechaReserva").prop("validity")?.badInput);
    const errorHora = Boolean($("#horaReserva").val()) && !horaValida;
    const esError = (pasoActual===1 && (errorFecha || errorHora)) || /incorrect|supera|finaliz|cambió|venció|no es válid/i.test(mensaje);
    $("#guiaReserva").toggleClass("aviso-error",esError).toggleClass("aviso-exito",!selector && !esError).toggleClass("aviso-pendiente",Boolean(selector) && !esError);
    if (mensaje!==ultimaGuia) {
      $("#guiaReserva").text(mensaje);
      ultimaGuia = mensaje;
    }
    $(".campo-guiado").removeClass("campo-guiado");
    if (selector) $(selector).addClass("campo-guiado");
    const listo = pasoActual===1 ? !guiaEquipo()[1] : pasoActual===2 ? decisionSnack && (!promoActiva || promoVigente(promoActiva)) && validarStock(itemsPedido()) && ($("input[name=quiereSnack]:checked").val()!=="si" || carrito.length>0) : pasoActual===3 ? validarDatos() : false;
    $("#pasoSiguiente").prop("disabled",!listo);
  }

  function mostrarPaso(numero, animar = true) {
    pasoActual = numero;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const anterior = $(".tarjeta-paso:visible");
    const destino = $(panelesPaso[numero-1]);
    // stop() completa transiciones anteriores para que nunca se superpongan tarjetas.
    $(".tarjeta-paso").stop(true,true);
    const entrar = function () {
      $(".tarjeta-paso").hide().prop("hidden",true);
      destino.removeAttr("hidden").css("opacity",1).hide().fadeIn(animar && !reducir ? 220 : 0, function () {
        // Una animación no debe quitar el foco si el usuario ya empezó a escribir en este paso.
        if (animar && !destino[0].contains(document.activeElement)) enfocarCampoActual();
      });
    };
    if (animar && !reducir) anterior.fadeTo(130,.25,entrar); else entrar();
    $(".progreso-reserva li").each(function (i) {
      $(this).toggleClass("completado",i<numero-1).toggleClass("actual",i===numero-1);
      if (i===numero-1) $(this).attr("aria-current","step"); else $(this).removeAttr("aria-current");
    });
    $("#pasoAnterior").prop("hidden",numero===1);
    $("#pasoSiguiente").prop("hidden",numero===4).text(["Continuar a snacks →","Continuar a mis datos →","Ver mi pedido →"][numero-1]||"");
    $("#etiquetaPaso").text("Paso "+numero+" de 4");
    $("#resHorario").text($("#fechaReserva").val()+" · "+$("#horaReserva").val());
    $("#resCliente").text($("#nombreCliente").val()+" "+$("#apellidoCliente").val());
    $("#resContacto").text($("#correoCliente").val()+" · "+$("#telefonoCliente").val());
    actualizarGuia();
  }


  function enfocarCampoActual(origen=null) {
    if (!asistenteIniciado || !$("#vista-reservar").is(":visible")) return;
    // En horizontal se guía hacia el siguiente dato válido después de cada elección completa.
    if(actualizarHorizontal()){
      guiarHorizontal(()=>{
        if(!$("#vista-reservar").is(":visible"))return null;
        actualizarGuia();
        const siguiente=guiaActual()[1] || (pasoActual===4?'#btnConfirmar':'#pasoSiguiente');
        return $(siguiente).filter(':visible:not(:disabled)').first()[0];
      },origen);
      return;
    }
    const selector = guiaActual()[1] || (pasoActual===4 ? "#btnConfirmar" : "#pasoSiguiente");
    const campo = $(selector).filter(":visible:not(:disabled)").first();
    if (!campo.length) return;
    campo[0].focus({preventScroll:true});
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) campo.addClass("campo-entrada").delay(450).queue(function(next){$(this).removeClass("campo-entrada");next();});
    const rect = campo[0].getBoundingClientRect();
    if (rect.top<80 || rect.bottom>window.innerHeight-70) campo[0].scrollIntoView({block:"nearest",behavior:$.fx.off?"auto":"smooth"});
  }

  // Los selectores avanzan al elegir; el texto espera Enter o cambio completo para no interrumpir nombres y correos.
  $(document).off("change.wgVinculo01","#vista-reservar select, #vista-reservar input").on("change.wgVinculo01","#vista-reservar select, #vista-reservar input",function () {
    if (!asistenteIniciado) return;
      // El texto se confirma al terminar la edición o pulsar Enter, nunca después de cada letra.
      if(this.matches('input[type=text],input[type=email],input[type=tel],textarea') && !actualizarHorizontal())return;
    const campo=this;
    aplazar(function () {
        if (actualizarHorizontal() || campo.type==="radio" || document.activeElement===campo || document.activeElement===document.body) {
        if (campo.type==="date" && (!campo.validity.valid || campo.value<fechaLocal())) return;
        if (campo.type==="time" && !campo.validity.valid) return;
          enfocarCampoActual(campo);
      }
      },0);
  });
  $(document).off("keydown.wgVinculo02","#vista-reservar input:not([type=radio])").on("keydown.wgVinculo02","#vista-reservar input:not([type=radio])",function(e) {
    if (e.key!=="Enter") return;
    e.preventDefault();
    actualizarGuia();
    enfocarCampoActual();
  });
  $(document).off("click.wgVinculo03","#unidadesDisponibles .unidad.libre, #segundasUnidades .unidad.libre").on("click.wgVinculo03","#unidadesDisponibles .unidad.libre, #segundasUnidades .unidad.libre",function () {
    aplazar(enfocarCampoActual,0);
  });

  function avanzarPaso() {
    actualizarGuia();
    if (pasoActual<4 && !$("#pasoSiguiente").prop("disabled")) mostrarPaso(pasoActual+1);
  }
  $("#pasoSiguiente").off("click.wgVinculo04").on("click.wgVinculo04",avanzarPaso);
  $("#pasoAnterior").off("click.wgVinculo05").on("click.wgVinculo05",()=>mostrarPaso(Math.max(1,pasoActual-1)));
  $(document).off("input.wgVinculo06 change.wgVinculo06","#vista-reservar input, #vista-reservar select").on("input.wgVinculo06 change.wgVinculo06","#vista-reservar input, #vista-reservar select",function (e) {
    if (this.id==="categoriaReserva" && e.type==="change") {
      $("#modeloReserva").find("option[value='']").remove();
      $("#modeloReserva").prepend(new Option("Elige un modelo", "")).val("");
      actualizarUnidades();
    }
    if (this.name==="quiereSnack") decisionSnack = true;
    actualizarGuia();
  });
  $(document).off("click.wgVinculo07","#vista-reservar .btn-agregar, #vista-reservar .cambiar-cantidad").on("click.wgVinculo07","#vista-reservar .btn-agregar, #vista-reservar .cambiar-cantidad",function () {
    decisionSnack = true;
    actualizarGuia();
  });

  // ---------------------------------------------
  // BITÁCORA
  // ---------------------------------------------
  function registrar(mensaje) {
    eventos.unshift({
      fecha:new Date().toLocaleString("es-BO"),
      mensaje
    });
    eventos = eventos.slice(0,100);
    escribirLocal("wg2_eventos", eventos);
    pintarBitacora();
  }

  function pintarBitacora() {
    const lista = document.querySelector("#bitacora");
    if(lista.firstChild?.nodeType===Node.TEXT_NODE) lista.firstChild.remove();
    reconciliar(lista,eventos.map((evento,indice)=>({evento,indice})),x=>x.indice,()=>document.createElement("p"),(fila,x)=>textoSiCambio(fila,textoSeguro(x.evento.fecha+" - "+x.evento.mensaje)));
    if(!eventos.length) lista.textContent="Todavía no hay eventos.";
  }
  $("#limpiarBitacora").off("click.wgVinculo08").on("click.wgVinculo08",async function () {
    if(!await confirmar("¿Limpiar la bitácora de este navegador?"))return;
    eventos = [];
    quitarLocal("wg2_eventos");
    pintarBitacora();
    toast("Bitácora limpiada.");
  });

  // fadeToggle alterna la visibilidad de los datos de la microempresa.
  $("#alternarContacto").off("click.wgVinculo09").on("click.wgVinculo09",function () {
    const boton=$(this);
    const reducir=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("#datosEmpresa").stop(true,true).fadeToggle(reducir?0:220,function () {
      const abierto=$(this).is(":visible");
      boton.attr("aria-expanded",String(abierto));
      boton.text(abierto?"Ocultar contacto y horarios":"Ver contacto y horarios");
    });
    registrar("Alternar datos de contacto con fadeToggle");
  });

  // ---------------------------------------------
  // AVISOS: mensajes en el flujo que no cubren los controles
  // ---------------------------------------------
  // Todos los mensajes utilizan una ubicación que no tapa la edición.
  function toast(mensaje) { notificar(mensaje); }

  // ---------------------------------------------
  // NAVEGACIÓN POR VISTAS
  // ---------------------------------------------
  function irVista(nombre, origen = null) {
    if (!["inicio","jugar","snacks","reservar","promos","info","mas","historial","horarios","contactos","carrito"].includes(nombre)) return;
    const destino = $("#vista-" + nombre);
    // Una confirmación no permanece activa detrás de otra pantalla.
    if(nombre!=='reservar' && pendiente && $("#modalReserva").is(":visible"))cerrarModal();
    document.body.dataset.pantalla = nombre;
    if (nombre === "historial") pintarHistorial();
    if (nombre === "carrito") document.querySelector("#vista-carrito").append(document.querySelector("#panelCarrito"));
    if (nombre === "snacks") document.querySelector(".snacks-layout").append(document.querySelector("#panelCarrito"));
    if (!destino.length) return;

    $(".vista").not(destino).stop(true,true)
      .hide().attr("hidden",true);

    if (nombre === "reservar" && carrito.length) {
      $("input[name=quiereSnack][value=si]").prop("checked",true);
      $("#snacksEnReserva").stop(true,true).removeAttr("hidden").show();
      actualizarResumen();
    }
    if (nombre === "jugar") actualizarContadoresEquipos();
    if (nombre === "reservar") iniciarAsistente(origen);
    destino.removeAttr("hidden").show();
    window.dispatchEvent(new Event("wg:vista"));
    if(nombre==="reservar") enfocarCampoActual();

    $(".nav-link").removeClass("activo");
    $(`.nav-link[data-vista="${nombre}"]`).addClass("activo");

    if (window.innerWidth <= 850) {
      // La barra inferior permanece visible al cambiar de pantalla.
      $("#btnMenu").attr("aria-expanded","false");
    }

    window.scrollTo({top:0,behavior:$.fx.off?"auto":"smooth"});
    registrar("Vista abierta: " + nombre);
  }

  $(document).off("click.wgVinculo10","[data-vista]").on("click.wgVinculo10","[data-vista]",function () {
    irVista($(this).data("vista"));
  });

  $("#btnMenu").off("click.wgVinculo11").on("click.wgVinculo11",function () {
    if (window.innerWidth > 850) return;
    const abierto = $(this).attr("aria-expanded") === "true";
    $("#menu").stop(true,true).slideToggle(200);
    $(this).attr("aria-expanded",String(!abierto));
  });

  let eraMovil = window.innerWidth <= 850;
  $(window).off("resize.wgVinculo12").on("resize.wgVinculo12",function () {
    const movil = window.innerWidth <= 850;
    if (movil !== eraMovil) {
      $("#menu").removeAttr("style");
      $("#btnMenu").attr("aria-expanded","false");
      eraMovil = movil;
    }
  });

  function tema(categoria) {
    $("body").removeClass(
      "tema-playstation tema-xbox tema-pc tema-arcade tema-internet"
    ).addClass("tema-" + categoria);
  }

  // ---------------------------------------------
  // CARRUSEL JQUERY
  // ---------------------------------------------
  function cargarModelos(selector,categoria) {
    const select = $(selector).empty();

    equipos.filter(e => e.categoria===categoria).forEach(e => {
      select.append(
        $("<option>").val(e.id)
          .text(`${e.nombre} — ${moneda(e.precio)}/h`)
      );
    });
  }

  // ---------------------------------------------
  // CATÁLOGO DE EQUIPOS
  // ---------------------------------------------
  let modeloPC = null;
  let paginaEquipos = 0, paginaSnacks = 0, paginaPromos = 0;
  function paginar(selector, pagina, filtro, atributo, control) {
    const tarjetas = [...document.querySelectorAll(selector)];
    const elegidas = tarjetas.filter(t=>(!filtro || filtro==="todos" || t.dataset[atributo]===filtro) && (selector!=="#catalogoEquipos > *" || filtro!=="pc" || !modeloPC || t.dataset.equipo===modeloPC));
    const limite = selector==="#listaPromos > *" ? 1 : (window.innerHeight < 740 ? 2 : 4);
    const paginas = Math.max(1, Math.ceil(elegidas.length/limite));
    pagina = Math.max(0,Math.min(pagina,paginas-1));
    tarjetas.forEach(t=>{ t.style.display=""; t.hidden=true; });
    elegidas.slice(pagina*limite,(pagina+1)*limite).forEach(t=>t.hidden=false);
    const caja = document.getElementById(control);
    caja.replaceChildren();
    if(!elegidas.length){caja.textContent="Sin resultados";return;}
    for (const [texto,delta] of [["← Anterior",-1],["Siguiente →",1]]) {
      const b=document.createElement("button"); b.className="btn secundario"; b.textContent=texto;
      b.disabled=delta<0 ? pagina===0 : pagina===paginas-1;
      b.dataset.paginaCatalogo=control; b.dataset.destinoPagina=String(pagina+delta);
      caja.append(b);
      if(delta<0) { const s=document.createElement("span"); s.textContent=`Página ${pagina+1} de ${paginas}`; caja.append(s); }
    }
  }
  $(document).off("click.wgPagina","[data-pagina-catalogo]").on("click.wgPagina","[data-pagina-catalogo]",function(){
    const destino = Number(this.dataset.destinoPagina);
    if(this.dataset.paginaCatalogo==="pagEquipos") paginaEquipos=destino;
    if(this.dataset.paginaCatalogo==="pagSnacks") paginaSnacks=destino;
    if(this.dataset.paginaCatalogo==="pagPromos") paginaPromos=destino;
    actualizarPaginas();
  });
  function actualizarPaginas() {
    paginar("#catalogoEquipos > *",paginaEquipos,$("#filtrosEquipos .activo").data("categoria"),"categoria","pagEquipos");
    paginar("#catalogoSnacks > *",paginaSnacks,$("#filtrosSnacks .activo").data("tipo"),"tipo","pagSnacks");
    paginar("#listaPromos > *",paginaPromos,"todos","","pagPromos");
  }
  function pintarEquipos() {
    $("#catalogoEquipos").empty();

    equipos.forEach(e => {
      insertarPlantilla($("#catalogoEquipos")[0], `
        <article class="tarjeta equipo-card"
                 data-categoria="${e.categoria}" data-equipo="${e.id}">
          <div class="tarjeta-imagen">
            <span class="badge">${e.categoria.toUpperCase()}</span>
            <img src="${e.imagen}" alt="${escapar(e.nombre)}"
                 width="320" height="200" loading="lazy" decoding="async" data-respaldo-imagen="./imagenes/equipos-neon.jpg">
          </div>
          <div class="tarjeta-cuerpo">
            <h3 class="tarjeta__titulo"><i class="bi ${e.icono}"></i> ${escapar(e.nombre)}</h3>
            <div class="precio">${moneda(e.precio)}/h</div>
            <div class="disponibilidad-catalogo" aria-live="polite"><span class="cuenta-libres">Disponibles: <b id="libres-${e.id}">${conteoUnidades(e).libres}</b></span><span class="cuenta-ocupadas">Ocupadas: <b id="ocupadas-${e.id}">${conteoUnidades(e).ocupadas}</b></span></div>
            <button class="btn secundario ancho btn-detalles"
                    aria-expanded="false">Ver detalles</button>
            <div class="detalles">${escapar(e.detalle)}</div>
            <button class="btn primario ancho btn-alquilar"
                    data-modelo="${e.id}">Alquilar hora</button>
          </div>
        </article>
      `);
    });
  }

  // Acordeón con slideToggle().
  $("#catalogoEquipos").off("click.wgVinculo13",".btn-detalles").on("click.wgVinculo13",".btn-detalles",function () {
    const abierto = $(this).attr("aria-expanded")==="true";
    $(this).next(".detalles").stop(true,true).slideToggle(200);
    $(this).attr("aria-expanded",String(!abierto))
      .text(abierto?"Ver detalles":"Ocultar detalles");
    registrar("Acordeón de equipo");
  });

  // Filtros con fadeIn/fadeOut().
  $("#filtrosEquipos").off("click.wgVinculo14",".filtro").on("click.wgVinculo14",".filtro",debounce(async function () {
    const categoria = $(this).data("categoria");
    if(categoria==="pc") {
      const eleccion=await mostrarDialogo("Computadoras","Selecciona el tipo de equipo",[{texto:"Todas",valor:"todas"},{texto:"PC Gamer",valor:"pcg"},{texto:"PC Normal",valor:"pcn"}]);
      if(eleccion===false)return;modeloPC=eleccion==="todas"?null:eleccion;
    } else modeloPC=null;
    $("#filtrosEquipos .filtro").removeClass("activo");
    $(this).addClass("activo");

    $(".equipo-card").each(function () {
      const mostrar = categoria==="todos" ||
        $(this).data("categoria")===categoria;

      $(this).stop(true,true)[mostrar?"fadeIn":"fadeOut"](200);
    });

    if (categoria!=="todos") tema(categoria);
    paginaEquipos=0; aplazar(actualizarPaginas,230);
    registrar("Filtro: " + categoria);
  },100));

  // Alquilar desde una tarjeta.
  $("#catalogoEquipos").off("click.wgVinculo15",".btn-alquilar").on("click.wgVinculo15",".btn-alquilar",function () {
    quitarPromocion(false);
    const e = buscarEquipo($(this).data("modelo"));
    if (!e) return;

    $("#categoriaReserva").val(e.categoria);
    cargarModelos("#modeloReserva",e.categoria);
    $("#modeloReserva").val(e.id);
    unidadElegida = null;

    tema(e.categoria);
    irVista("reservar", {tipo:"equipo", nombre:e.nombre});
    actualizarUnidades();
    toast("Seleccionaste " + e.nombre);
  });

  // ---------------------------------------------
  // SNACKS DESTACADOS: SOLO VISUALES
  // ---------------------------------------------
  function pintarSnacks() {
    // Al vender un snack solo cambia su stock, sin recrear las tarjetas del catálogo.
    if(document.querySelector('#catalogoSnacks .snack-card')){
      for(const p of productos){
        const stock=stockDisponible(p);
        for(const boton of document.querySelectorAll('.btn-agregar[data-id="'+p.id+'"]')){
          boton.disabled=stock===0;
          const tarjeta=boton.closest('.snack-card');
          if(tarjeta)textoSiCambio(tarjeta.querySelector('.stock'),'Stock: '+stock);
          const fila=boton.closest('.snack-fila');
          if(fila)textoSiCambio(fila.querySelector('small'),moneda(p.precio)+' · Stock: '+stock);
        }
      }
      return;
    }
    $("#catalogoSnacks, #catalogoSnackReserva").empty();

    productos.forEach(p => {
      const stock = stockDisponible(p);
      const boton = `
        <button class="btn primario btn-agregar"
                data-id="${p.id}"
                ${stock===0?"disabled":""}>+ Agregar</button>
      `;

      insertarPlantilla($("#catalogoSnacks")[0], `
        <article class="tarjeta snack-card" data-tipo="${p.tipo}">
          <div class="tarjeta-imagen">
            <span class="badge">${p.tipo}</span>
            <img src="${p.imagen}" alt="${escapar(p.nombre)}"
                 loading="lazy" decoding="async" data-respaldo-imagen="./imagenes/snacks-neon.jpg" width="320" height="200">
          </div>
          <div class="tarjeta-cuerpo">
            <h3 class="tarjeta__titulo">${escapar(p.nombre)}</h3>
            <div class="precio">${moneda(p.precio)}</div>
            <p class="stock">Stock: ${stock}</p>
            ${boton}
          </div>
        </article>
      `);

      insertarPlantilla($("#catalogoSnackReserva")[0], `
        <div class="snack-fila">
          <div>
            <strong>${escapar(p.nombre)}</strong>
            <small>${moneda(p.precio)} · Stock: ${stock}</small>
          </div>
          ${boton}
        </div>
      `);
    });
  }

  $("#filtrosSnacks").off("click.wgVinculo16",".filtro").on("click.wgVinculo16",".filtro",debounce(async function () {
    const tipo = $(this).data("tipo");
    $("#filtrosSnacks .filtro").removeClass("activo");
    $(this).addClass("activo");

    $(".snack-card").each(function () {
      const mostrar = tipo==="todos" || $(this).data("tipo")===tipo;
      $(this).stop(true,true)[mostrar?"fadeIn":"fadeOut"](200);
    });

    paginaSnacks=0; aplazar(actualizarPaginas,230);
    registrar("Filtro snacks: " + tipo);
  },100));

  function snacksAdicionales() {
    return $("input[name=quiereSnack]:checked").val()==="si"
      ? carrito.map(x=>({...x})) : [];
  }

  function itemsIncluidos() {
    return promoActiva ? [{id:4,cantidad:promoActiva.gaseosas}] : [];
  }

  // Suma las cantidades de un mismo producto.
  function combinarItems(items) {
    const mapa = new Map();
    items.forEach(x =>
      mapa.set(x.id,(mapa.get(x.id)||0)+x.cantidad)
    );
    return [...mapa].map(([id,cantidad])=>({id,cantidad}));
  }

  function itemsPedido() {
    return combinarItems([
      ...snacksAdicionales(),
      ...itemsIncluidos()
    ]);
  }

  function validarStock(items) {
    return items.every(x => {
      const p = buscarProducto(x.id);
      return p && Number.isInteger(x.cantidad) && x.cantidad>0 &&
        x.cantidad<=stockDisponible(p);
    });
  }

  function pintarCarrito() {
    // Las filas mantienen su identidad y foco; solo cambia la cantidad solicitada.
    for(const selector of ['#listaCarrito','#carritoReserva']){
      const lista=document.querySelector(selector);
      reconciliar(lista,carrito.filter(x=>buscarProducto(x.id)),x=>x.id,x=>{
        const p=buscarProducto(x.id);
        const fila=document.createElement('div');fila.className='item-carrito';
        const datos=document.createElement('div'),nombre=document.createElement('strong'),precio=document.createElement('small');
        nombre.textContent=p.nombre;precio.textContent=moneda(p.precio);datos.append(nombre,precio);
        const controles=document.createElement('div');controles.className='controles-cantidad';
        const cantidad=document.createElement('strong');
        for(const cambio of [-1,1]){
          const boton=document.createElement('button');boton.type='button';boton.className='cambiar-cantidad';
          boton.dataset.id=String(p.id);boton.dataset.cambio=String(cambio);
          boton.textContent=cambio<0?'−':'+';boton.setAttribute('aria-label',(cambio<0?'Restar ':'Sumar ')+p.nombre);
          controles.append(boton);if(cambio<0)controles.append(cantidad);
        }
        fila.append(datos,controles);return fila;
      },(fila,x)=>textoSiCambio(fila.querySelector('.controles-cantidad strong'),x.cantidad));
      if(!carrito.length)textoSiCambio(lista,'Sin productos.');
    }

    const total = carrito.reduce((s,x) => {
      const p = buscarProducto(x.id);
      return s + (p ? p.precio*100*x.cantidad : 0);
    },0);

    $("#totalCarrito").text(moneda(total/100));
    guardar();
    window.dispatchEvent(new Event("wg:carrito"));
    actualizarResumen();
  }

  $(document).off("click.wgVinculo17",".btn-agregar").on("click.wgVinculo17",".btn-agregar",function () {
    const id = Number($(this).data("id"));
    const p = buscarProducto(id);
    if (!p) return;

    if (cantidadCarrito(id)+(itemsIncluidos().find(x=>x.id===id)?.cantidad||0)>=stockDisponible(p)) {
      toast("Stock insuficiente.");
      return;
    }

    const item = carrito.find(x=>x.id===id);
    if (item) item.cantidad++;
    else carrito.push({id,cantidad:1});

    pintarCarrito();
    $("input[name=quiereSnack][value=si]").prop("checked",true);
    $("#snacksEnReserva").stop(true,true).removeAttr("hidden").show();
    actualizarResumen();
    registrar("Snack agregado: " + p.nombre);
    toast(p.nombre + " agregado.");
  });

  $(document).off("click.wgVinculo18",".cambiar-cantidad").on("click.wgVinculo18",".cambiar-cantidad",function () {
    const id = Number($(this).data("id"));
    const cambio = Number($(this).data("cambio"));
    const item = carrito.find(x=>x.id===id);
    const p = buscarProducto(id);
    if (!item || !p) return;

    if (cambio>0 && item.cantidad+(itemsIncluidos().find(x=>x.id===id)?.cantidad||0)>=stockDisponible(p)) {
      toast("No hay más stock.");
      return;
    }

    item.cantidad += cambio;
    if (item.cantidad<=0) carrito=carrito.filter(x=>x.id!==id);
    registrar("Cantidad modificada: "+p.nombre+" / "+(item.cantidad>0?item.cantidad:"eliminado"));
    pintarCarrito();
  });

  $("#vaciarCarrito").off("click.wgVinculo19").on("click.wgVinculo19",async function () {
    if(!await confirmar("¿Vaciar todos los productos del carrito?"))return;
    carrito=[];
    pintarCarrito();
    toast("Carrito vaciado.");
    registrar("Carrito vaciado");
  });

  // Mostrar u ocultar snacks dentro de la reserva.
  $("input[name=quiereSnack]").off("change.wgVinculo20").on("change.wgVinculo20",function () {
    const si = $(this).val()==="si";
    if (si) {
      $("#snacksEnReserva").removeAttr("hidden")
        .hide().slideDown(200);
    } else {
      $("#snacksEnReserva").slideUp(200,function () {
        $(this).attr("hidden",true);
      });
    }
    actualizarResumen();
    registrar("Snacks opcionales: " + (si?"Sí":"No"));
  });

  // ---------------------------------------------
  // SELECCIÓN DE EQUIPOS Y HORARIOS
  // ---------------------------------------------
  function construirDuraciones() {
    $("#duracionReserva").empty();

    // Desde 10 hasta 480 minutos, de 10 en 10.
    for (let min=10;min<=480;min+=10) {
      $("#duracionReserva").append(
        $("<option>").val(min).text(textoDuracion(min))
      );
    }
    $("#duracionReserva").val("60");
  }

  function pintarBotonesUnidades(selector,modelo,seleccion,segunda=false) {
    const contenedor=document.querySelector(selector);
    const i=intervaloActual();
    const unidades=modelo&&horarioValido(i)?codigos(modelo):[];
    reconciliar(contenedor,unidades,codigo=>codigo,codigo=>{
      const boton=document.createElement('button');boton.type='button';boton.dataset.unidad=codigo;
      const icono=document.createElementNS('http://www.w3.org/2000/svg','svg');
      icono.classList.add('icono');icono.setAttribute('aria-hidden','true');
      const uso=document.createElementNS('http://www.w3.org/2000/svg','use');
      uso.setAttribute('href','./imagenes/iconos.svg#game');icono.append(uso);
      const estado=document.createElement('span');
      boton.append(icono,document.createTextNode(' '+codigo),estado);return boton;
    },(boton,codigo)=>{
      // Se conserva el control; únicamente cambian su disponibilidad y selección.
      const disponible=libre(codigo,i)&&(!segunda||codigo!==unidadElegida);
      boton.classList.add('unidad');boton.classList.toggle('libre',disponible);
      boton.classList.toggle('ocupada',!disponible);boton.classList.toggle('seleccionada',codigo===seleccion);
      boton.disabled=!disponible;boton.setAttribute('aria-pressed',String(codigo===seleccion));
      textoSiCambio(boton.querySelector('span'),disponible?'Libre':'Ocupada');
    });
  }

  function actualizarContadoresEquipos() {
    const intervalo = intervaloActual();
    const valido = horarioValido(intervalo);
    equipos.forEach(e=>{
      const c=conteoUnidades(e,valido?intervalo:null);
      $("#libres-"+e.id).text(c.libres);
      $("#ocupadas-"+e.id).text(c.ocupadas);
    });
    $("#contextoDisponibilidad").text(valido
      ? "Disponibilidad para el horario elegido en Reservar."
      : "La disponibilidad se calcula para el horario elegido.");
  }

  function actualizarUnidades() {
    actualizarContadoresEquipos();
    const modelo = buscarEquipo($("#modeloReserva").val());
    const i = intervaloActual();

    if (!modelo || !horarioValido(i)) {
      unidadElegida=null;
      segundaUnidad=null;
      $("#unidadesDisponibles, #segundasUnidades").empty();
      $("#conteoDisponibles").text("—");
      $("#mensajeDisponibilidad").text(
        "La sesión debe estar dentro del horario comercial y terminar el mismo día."
      );
      actualizarResumen();
      return;
    }

    const disponibles = codigos(modelo).filter(c=>libre(c,i));

    if (!disponibles.includes(unidadElegida)) unidadElegida=null;

    pintarBotonesUnidades(
      "#unidadesDisponibles",modelo,unidadElegida
    );

    $("#conteoDisponibles").text(
      `${disponibles.length} de ${modelo.cantidad} libres`
    );

    $("#mensajeDisponibilidad").text(
      disponibles.length
        ? "6. Pulsa un equipo marcado como libre para seleccionarlo."
        : "No hay unidades libres en ese horario."
    );

    actualizarSegundaUnidad();
    actualizarResumen();
  }

  function actualizarSegundaUnidad() {
    if (!promoActiva || !promoActiva.dosEstaciones) return;

    const modelo = buscarEquipo($("#modeloSegundo").val());
    const i = intervaloActual();

    if (!modelo || !horarioValido(i)) {
      segundaUnidad=null;
      $("#segundasUnidades").empty();
      return;
    }

    if (segundaUnidad===unidadElegida ||
        !codigos(modelo).includes(segundaUnidad) ||
        !libre(segundaUnidad,i)) {
      segundaUnidad=null;
    }

    pintarBotonesUnidades(
      "#segundasUnidades",modelo,segundaUnidad,true
    );

    $("#ayudaSegundaUnidad").text(
      segundaUnidad
        ? "Segunda unidad: " + segundaUnidad
        : "Selecciona otra unidad libre."
    );
  }

  $("#unidadesDisponibles").off("click.wgVinculo21",".unidad.libre").on("click.wgVinculo21",".unidad.libre",function () {
    unidadElegida=$(this).data("unidad");
    actualizarUnidades();
    registrar("Unidad elegida: " + unidadElegida);
  });

  $("#segundasUnidades").off("click.wgVinculo22",".unidad.libre").on("click.wgVinculo22",".unidad.libre",function () {
    segundaUnidad=$(this).data("unidad");
    actualizarSegundaUnidad();
    actualizarResumen();
    registrar("Segunda unidad: " + segundaUnidad);
  });

  $("#categoriaReserva").off("change.wgVinculo23").on("change.wgVinculo23",function () {
    cargarModelos("#modeloReserva",$(this).val());
    unidadElegida=null;
    tema($(this).val());
    actualizarUnidades();
  });

  $("#modeloReserva").off("change.wgVinculo24").on("change.wgVinculo24",function () {
    unidadElegida=null;
    actualizarUnidades();
  });

  $("#modeloSegundo").off("change.wgVinculo25").on("change.wgVinculo25",function () {
    segundaUnidad=null;
    actualizarSegundaUnidad();
    actualizarResumen();
  });

  $("#fechaReserva, #horaReserva, #duracionReserva")
    .off("input.wgVinculo26 change.wgVinculo26").on("input.wgVinculo26 change.wgVinculo26",function () {
      actualizarUnidades();
    });

  $("#rapidaCategoria").off("change.wgVinculo27").on("change.wgVinculo27",function () {
    cargarModelos("#rapidaModelo",$(this).val());
  });

  $("#irReserva").off("click.wgVinculo28").on("click.wgVinculo28",function () {
    quitarPromocion(false);
    const e=buscarEquipo($("#rapidaModelo").val());
    if (!e) return;

    $("#categoriaReserva").val(e.categoria);
    cargarModelos("#modeloReserva",e.categoria);
    $("#modeloReserva").val(e.id);
    unidadElegida=null;
    tema(e.categoria);
    irVista("reservar", {tipo:"equipo", nombre:e.nombre});
    actualizarUnidades();
  });

  // ---------------------------------------------
  // PROMOCIONES: ACTIVACIÓN SOLO POR CLIC
  // ---------------------------------------------
  function pintarPromociones() {
    $("#listaPromos").empty();

    promociones.forEach(p => {
      insertarPlantilla($("#listaPromos")[0], `
        <article class="tarjeta promo-card">
          <div class="tarjeta-imagen promo-visual">
            <img src="${p.imagen}" alt="${escapar(p.descripcion)}" loading="lazy" decoding="async" width="640" height="420">
            <div class="temporizador-imagen"><span>La oferta termina en</span><strong id="relojPromo${p.id}" class="promo-reloj"></strong></div>
          </div>
          <div class="tarjeta-cuerpo">
            <h3 class="tarjeta__titulo tarjeta__titulo--promocion">${escapar(p.nombre)}</h3>
            <button class="btn primario btn-usar-promo" data-id="${p.id}">Elegir esta promoción</button>
          </div>
        </article>
      `);
    });
  }

  function actualizarRelojes() {
    promociones.forEach(p => {
      $("#relojPromo"+p.id).text(tiempoPromo(p));
      $(`.btn-usar-promo[data-id="${p.id}"]`)
        .prop("disabled",!promoVigente(p))
        .text(promoVigente(p)
          ?"Elegir esta promoción":"Promoción finalizada");
    });

    const primera = promociones.find(p=>p.id===1 && promoVigente(p));
    $("#promoInicioNombre").text(
      primera ? primera.nombre : "Ofertas finalizadas"
    );
    $("#promoInicioEstado").text(primera ? "Ahorra Bs 5 en tu paquete" : "Esta oferta ha finalizado");
    $("#contadorInicio").text(
      primera ? tiempoPromo(primera) : "FINALIZADAS"
    );

    // Si una oferta vence mientras se está
    // preparando la reserva, se desactiva.
    if (promoActiva && !promoVigente(promoActiva)) {
      quitarPromocion(false);
      toast("La promoción ha finalizado.");
    }
  }

  function configurarOpcionesPromo() {
    $("#opcionesPromo, #grupoSnackPromo, #grupoSaborPromo, #bloqueSegundaUnidad").prop("hidden",true);
    if (promoActiva) $("#opcionesPromo, #grupoSaborPromo").removeAttr("hidden");
  }

  function aplicarPromocion(p) {
    if (!promoVigente(p)) {
      toast("Esta promoción ya finalizó.");
      return;
    }

    promoActiva=p;
    if(preferencias().recordarPromocion)escribirLocal("wg_promocion",p.id);
    unidadElegida=null;
    segundaUnidad=null;

    // La duración de la oferta queda fijada.
    $("#duracionReserva").val(String(p.minutos))
      .prop("disabled",true);

    $("#bannerPromoActiva").removeAttr("hidden");
    $("#nombrePromoActiva").text(
      p.nombre + " · Descuento de " + moneda(p.descuento)
    );
    $("#descripcionPromoActiva").text(p.descripcion+" La duración está fijada. Elige equipo, fecha y hora; luego selecciona una unidad libre. Los snacks del paquete se agregan automáticamente.");

    configurarOpcionesPromo();
    irVista("reservar", {tipo:"promo", nombre:p.nombre});
    actualizarUnidades();

    registrar("Promoción seleccionada: "+p.nombre);
    toast("Promoción activada. Completa tu reserva.");
  }

  function quitarPromocion(avisar=true) {
    promoActiva=null;
    quitarLocal("wg_promocion");
    segundaUnidad=null;

    $("#duracionReserva").prop("disabled",false);
    $("#bannerPromoActiva, #opcionesPromo, #bloqueSegundaUnidad")
      .attr("hidden",true);

    $("#duracionReserva").val("60");
    actualizarUnidades();

    if (avisar) {
      toast("Promoción retirada.");
      registrar("Promoción retirada");
    }
  }

  $("#listaPromos").off("click.wgVinculo29",".btn-usar-promo").on("click.wgVinculo29",".btn-usar-promo",function () {
    const p=promociones.find(x=>x.id===Number($(this).data("id")));
    if (p) aplicarPromocion(p);
  });

  $("#quitarPromo").off("click.wgVinculo30").on("click.wgVinculo30",function () {
    quitarPromocion();
  });

  $("#snackPromo, #saborPromo").off("change.wgVinculo31").on("change.wgVinculo31",function () {
    actualizarResumen();
  });

  // ---------------------------------------------
  // CALCULADORA EN TIEMPO REAL
  // ---------------------------------------------
  function calcularPedido() {
    const modelo=buscarEquipo($("#modeloReserva").val());
    const segundo=buscarEquipo($("#modeloSegundo").val());
    const i=intervaloActual();
    const minutos=i?.minutos||0;

    let juego=modelo ? costoMinutos(modelo.precio,minutos) : 0;

    if (promoActiva?.dosEstaciones && segundo) {
      juego+=costoMinutos(segundo.precio,minutos);
    }

    const items=itemsPedido();
    const snacks=items.reduce((s,x)=>{
      const p=buscarProducto(x.id);
      return s+(p?p.precio*100*x.cantidad:0);
    },0);

    const descuento=promoActiva && promoVigente(promoActiva)
      ?promoActiva.descuento*100:0;

    return {
      juego,snacks,descuento,
      total:totalPedido(juego,snacks,descuento),
      items
    };
  }

  function pintarDetalleSnacks(selector, items, incluidos = []) {
    const lista = $(selector).empty();
    if (!items.length) lista.append($("<p>").addClass("ayuda").text("Sin snacks seleccionados."));
    items.forEach(x => {
      const p = buscarProducto(x.id);
      if (!p) return;
      const cantidadPromo = incluidos.find(y=>y.id===x.id)?.cantidad || 0;
      const fila = $("<div>").addClass("detalle-snack");
      const nombre = $("<div>").append($("<strong>").text(x.cantidad+" × "+p.nombre));
      nombre.append($("<small>").text(moneda(p.precio)+" c/u"));
      if (cantidadPromo) nombre.append($("<small>").addClass("origen-promo").text(
        cantidadPromo+" del paquete"+(x.cantidad>cantidadPromo ? " · "+(x.cantidad-cantidadPromo)+" extra(s)" : "")
      ));
      fila.append(nombre, $("<strong>").text(moneda(p.precio*x.cantidad)));
      lista.append(fila);
    });
  }

  function actualizarResumen() {
    const modelo=buscarEquipo($("#modeloReserva").val());
    const segundo=buscarEquipo($("#modeloSegundo").val());
    const i=intervaloActual();
    const c=calcularPedido();

    $("#resModelo").text(
      modelo ? modelo.nombre +
        (promoActiva?.dosEstaciones && segundo
          ?" + "+segundo.nombre:"") : "—"
    );

    $("#resUnidad").text(
      (unidadElegida||"—") +
      (promoActiva?.dosEstaciones
        ?" / "+(segundaUnidad||"—"):"")
    );

    $("#resDuracion").text(
      i?textoDuracion(i.minutos):"—"
    );

    $("#resJuego").text(moneda(c.juego/100));
    $("#resSnacks").text(moneda(c.snacks/100));
    $("#filaSnacksResumen, #resListaSnacks").prop("hidden",c.items.length===0);
    pintarDetalleSnacks("#resListaSnacks", c.items, itemsIncluidos());
    $("#resNormal").text(moneda((c.juego+c.snacks)/100));
    $("#filaNormal").prop("hidden",!promoActiva);
    $("#resTotal").text(moneda(c.total/100));

    const conPromo=Boolean(promoActiva);
    $("#filaDescuento").prop("hidden",!conPromo);
    $("#resDescuento").text("− "+moneda(c.descuento/100));

    $("#resDetallePromo").prop("hidden",!conPromo).text(
      conPromo
        ? "Oferta aplicada: "+promoActiva.nombre+
          ". El paquete suma juego y snacks y descuenta Bs 5. Los extras se cobran a precio normal."
        : "Tarifa normal. Sin descuento."
    );

    actualizarBoton();
    actualizarGuia();
    return c;
  }

  // ---------------------------------------------
  // FORMULARIO PROGRESIVO
  // ---------------------------------------------


  function validarDatos() {
    const nombre=$("#nombreCliente").val().trim();
    const apellido=$("#apellidoCliente").val().trim();
    const correo=$("#correoCliente").val().trim();
    const telefono=$("#telefonoCliente").val().trim();

    const identidad=validarIdentidad({nombre,apellido,email:correo,telefono});
    const {nombre:n,apellido:a,correo:c,telefono:t}=identidad;

    $("#apellidoCliente").prop("disabled",!n);
    $("#correoCliente").prop("disabled",!(n&&a));
    $("#telefonoCliente").prop("disabled",!(n&&a&&c));

    // La ayuda en rojo se activa al escribir un valor incorrecto. Verde confirma una entrada válida.
    const ayudas = [
      ["#nombreCliente","#ayudaNombre",nombre,n,"Nombre correcto.","Usa entre 2 y 50 letras. Ej.: Juan."],
      ["#apellidoCliente","#ayudaApellido",apellido,a,"Apellido correcto.","Usa entre 2 y 60 letras. Ej.: Pérez."],
      ["#correoCliente","#ayudaCorreo",correo,c,"Correo correcto.","Usa el formato nombre@correo.com."],
      ["#telefonoCliente","#ayudaTelefono",telefono,t,"Celular correcto.","Usa 8 dígitos. Debe comenzar con 6 o 7."]
    ];
    for(const [campo,ayuda,valor,valido,correcto,pendiente] of ayudas){
      const activo = !$(campo).prop("disabled");
      const error = activo && Boolean(valor) && !valido;
      const mensaje = activo && valido ? correcto : error && palabraBloqueada(valor) && (campo==="#nombreCliente" || campo==="#apellidoCliente") ? "Usa un nombre apropiado." : pendiente;
      $(campo).attr("aria-invalid",String(error));
      $(ayuda).text(mensaje).toggleClass("reserva-ayuda--valida",activo&&valido).toggleClass("reserva-ayuda--error",error);
    }
    return n&&a&&c&&t;
  }

  function reservaLista() {
    const i=intervaloActual();
    const modelo=buscarEquipo($("#modeloReserva").val());

    if (!validarDatos() || !horarioValido(i) ||
        !modelo || !unidadElegida ||
        !codigos(modelo).includes(unidadElegida) ||
        !libre(unidadElegida,i)) return false;

    if (promoActiva) {
      if (!promoVigente(promoActiva) ||
          i.minutos!==promoActiva.minutos) return false;

      if (promoActiva.dosEstaciones) {
        const segundo=buscarEquipo($("#modeloSegundo").val());

        if (!segundo || !segundaUnidad ||
            segundaUnidad===unidadElegida ||
            !codigos(segundo).includes(segundaUnidad) ||
            !libre(segundaUnidad,i)) return false;
      }
    }

    return validarStock(itemsPedido());
  }

  function actualizarBoton() {
    $("#btnConfirmar").prop("disabled",!reservaLista());
    actualizarGuia();
  }

  $("#nombreCliente, #apellidoCliente, #correoCliente, #telefonoCliente")
    .off("input.wgVinculo32 blur.wgVinculo32").on("input.wgVinculo32 blur.wgVinculo32",function () {
      validarDatos();
      actualizarBoton();
    });



  // ---------------------------------------------
  // FORMULARIO: preventDefault()
  // ---------------------------------------------
  $("#formReserva").off("submit.wgVinculo37").on("submit.wgVinculo37",function(e) {
    e.preventDefault();
    $("#errorFormulario").text("");

    if (pasoActual !== 4) { avanzarPaso(); return; }
    if (!reservaLista()) {
      $("#errorFormulario").text(
        "Revisa tus datos, unidades, horario y stock."
      );
      toast("Revisa los datos de tu reserva.");
      return;
    }

    const i=intervaloActual();
    const c=calcularPedido();

    pendiente={
      id:"WG-"+Date.now().toString(36).toUpperCase(),
      nombre:textoSeguro($("#nombreCliente").val().trim()),
      apellido:textoSeguro($("#apellidoCliente").val().trim()),
      correo:textoSeguro($("#correoCliente").val().trim()),
      telefono:textoSeguro($("#telefonoCliente").val().trim()),
      unidades:promoActiva?.dosEstaciones
        ?[unidadElegida,segundaUnidad]
        :[unidadElegida],
      modelo:$("#modeloReserva").val(),
      inicio:i.inicio.toISOString(),
      fin:i.fin.toISOString(),
      minutos:i.minutos,
      items:c.items.map(x=>({...x})),
      promoId:promoActiva?.id||null,
      sabor:promoActiva?$("#saborPromo").val():null,
      incluidos:itemsIncluidos().map(x=>({...x})),
      juegoCentavos:c.juego,
      snacksCentavos:c.snacks,
      descuentoCentavos:c.descuento,
      totalCentavos:c.total
    };

    abrirModal();
    registrar("Formulario de reserva validado");
  });

  // ---------------------------------------------
  // MODAL DE 30 SEGUNDOS
  // ---------------------------------------------
  function abrirModal() {
    if (!pendiente) return;

    focoAnterior=document.activeElement;
    document.querySelector("main").inert=true;document.querySelector("header").inert=true;
    $("#detalleModal").empty();

    [
      "Cliente: "+pendiente.nombre+" "+pendiente.apellido,
      "Equipo(s): "+pendiente.unidades.join(", "),
      "Duración: "+textoDuracion(pendiente.minutos),
      ...(pendiente.promoId ? ["Promoción: "+promociones.find(p=>p.id===pendiente.promoId).nombre] : []),
      "Precio: "+moneda(pendiente.juegoCentavos/100),
      ...(pendiente.items.length ? ["Snacks: "+moneda(pendiente.snacksCentavos/100)] : []),
      ...(pendiente.descuentoCentavos ? ["Descuento: − "+moneda(pendiente.descuentoCentavos/100)] : []),
      "Total: "+moneda(pendiente.totalCentavos/100)
    ].forEach(t=>$("<p>").text(t).appendTo("#detalleModal"));

    if (pendiente.items.length) $("<h3>").text("Snacks de tu pedido").appendTo("#detalleModal");
    $("<div>").attr("id","snacksModal").appendTo("#detalleModal");
    if (pendiente.items.length) pintarDetalleSnacks("#snacksModal", pendiente.items, pendiente.incluidos);
    $("#contadorModal").text("00:30");
    $("#modalReserva").attr("aria-hidden","false").fadeIn(200);
    $("#aceptarModal").trigger("focus");

    timerModal?.();
    venceModal=Date.now()+30000;

    timerModal=relojVisible(function () {
      const restante=Math.max(
        0,Math.ceil((venceModal-Date.now())/1000)
      );
      $("#contadorModal").text(
        "00:"+String(restante).padStart(2,"0")
      );

      if (restante<=0) {
        cerrarModal();
        toast("Tarifa Flash Expirada");
        registrar("Modal de reserva expirado");
      }
    },200,['reservar']);
  }

  function cerrarModal() {
    timerModal?.();
    timerModal=null;
    pendiente=null;
    $("#modalReserva").attr("aria-hidden","true").fadeOut(200);

    document.querySelector("main").inert=false;document.querySelector("header").inert=false;
    if (focoAnterior?.focus) focoAnterior.focus();
  }

  $("#cerrarModal, #cancelarModal").off("click.wgVinculo38").on("click.wgVinculo38",function () {
    cerrarModal();
    registrar("Confirmación cancelada");
  });

  $(document).off("keydown.wgVinculo39").on("keydown.wgVinculo39",function(e) {
    if (e.key==="Escape" && $("#modalReserva").is(":visible"))
      cerrarModal();
  });

  $("#modalReserva").off("keydown.wgVinculo40").on("keydown.wgVinculo40",function(e) {
    if (e.key!=="Tab") return;

    const botones=$(this).find("button:visible:not(:disabled)");
    const primero=botones[0];
    const ultimo=botones[botones.length-1];

    if (e.shiftKey && document.activeElement===primero) {
      e.preventDefault(); ultimo.focus();
    } else if (!e.shiftKey && document.activeElement===ultimo) {
      e.preventDefault(); primero.focus();
    }
  });

  // ---------------------------------------------
  // CONFIRMACIÓN FINAL
  // ---------------------------------------------
  $("#aceptarModal").off("click.wgVinculo41").on("click.wgVinculo41",async function () {
    if($(this).prop("disabled"))return;
    if (!pendiente || Date.now()>=venceModal) {
      cerrarModal();
      toast("Tarifa Flash Expirada");
      return;
    }

    const r=pendiente;
    const i={
      inicio:new Date(r.inicio),
      fin:new Date(r.fin)
    };

    // Verificar nuevamente disponibilidad y stock.
    const disponibles=r.unidades.every(c=>libre(c,i));
    const promoCorrecta=!r.promoId ||
      promoVigente(promociones.find(p=>p.id===r.promoId));

    if (!disponibles || !validarStock(r.items) || !promoCorrecta || !horarioValido(i)) {
      cerrarModal();
      actualizarUnidades();
      toast("La disponibilidad, el stock o la oferta ha cambiado.");
      return;
    }

    const antes={reservas:reservas.slice(),ventas:ventas.slice(),carrito:carrito.slice()};
    $("#aceptarModal").prop("disabled",true);
    reservas.push({...r});

    r.items.forEach(x=>{
      ventas.push({id:x.id,cantidad:x.cantidad});
    });

    carrito=[];
    const guardado=await guardar();
    $("#aceptarModal").prop("disabled",false);
    if(!guardado){reservas=antes.reservas;ventas=antes.ventas;carrito=antes.carrito;pintarHistorial();toast("No se pudo guardar. Libera espacio en el navegador e inténtalo de nuevo.");return;}
    cerrarModal();

    // Limpiar el formulario después de confirmar.
    $("#formReserva")[0].reset();
    $("#nombreCliente, #apellidoCliente, #correoCliente, #telefonoCliente")
      .val("");
    $("#apellidoCliente, #correoCliente, #telefonoCliente")
      .prop("disabled",true);

    quitarPromocion(false);
    unidadElegida=null;
    segundaUnidad=null;

    $("input[name=quiereSnack][value=no]").prop("checked",true);
    $("#snacksEnReserva").attr("hidden",true).hide();

    pintarSnacks();
    actualizarPaginas();
    pintarCarrito();
    actualizarUnidades();
    validarDatos();

    asistenteIniciado=false;
    registrar("Reserva confirmada: "+r.id+
      " / "+r.unidades.join(", "));

    irVista("inicio");
    mostrarReservaGuardada(r.id);
  });

  // ---------------------------------------------
  // INICIALIZACIÓN GENERAL
  // ---------------------------------------------


  $("#fechaReserva")
    .attr("min",fechaLocal())
    .attr("max",new Date().getFullYear()+"-12-31")
    .val(fechaLocal());

  construirDuraciones();

  cargarModelos("#rapidaModelo","playstation");
  cargarModelos("#modeloReserva","playstation");




  pintarEquipos();

  pintarSnacks();
  pintarCarrito();
  pintarPromociones();
  pintarBitacora();
  actualizarUnidades();
  actualizarRelojes();
  validarDatos();

  // Contadores actualizados cada segundo.
  relojVisible(()=>{actualizarRelojes();actualizarHorario();},1000,['inicio','promos','horarios']);

  // Actualización al regresar a la pestaña.
  $(window).off("focus.wgVinculo42").on("focus.wgVinculo42",function () {
    actualizarRelojes();
    actualizarUnidades();
  });

  actualizarPaginas();
  iniciarPWA();
  const aplicarPreferencias=datos=>{if(!datos.recordarPromocion)quitarLocal('wg_promocion'); $.fx.off=Boolean(datos.movimientoReducido)||matchMedia('(prefers-reduced-motion: reduce)').matches; };
  aplicarPreferencias(preferencias());
  const detenerMovimiento=e=>{if($.fx.off)e.target.getAnimations?.().forEach(a=>{try{a.finish();}catch{a.cancel();}});};
  document.addEventListener('transitionrun',detenerMovimiento,true);document.addEventListener('animationstart',detenerMovimiento,true);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>aplicarPreferencias(preferencias()));
  window.addEventListener('pagehide',()=>{timerModal?.();clearTimeout(toastTimer);cerrarAlmacenamiento();if(pendiente)cerrarModal();});
  if(promoPorRecuperar){const p=promociones.find(p=>p.id===Number(promoPorRecuperar));if(p&&promoVigente(p)){aplicarPromocion(p);irVista('inicio');}else quitarLocal('wg_promocion');promoPorRecuperar=null;}
  $(document).off('click.wgVinculo43','[data-accion="ajustes"]').on('click.wgVinculo43','[data-accion="ajustes"]',async()=>{
    const modulo=await import('./ajustes.js').catch(()=>null);if(!modulo){toast('No se pudo abrir Ajustes. Revisa la conexión.');return;}const {abrirAjustes}=modulo;
    abrirAjustes({actualizar:buscarActualizacion,preferencias:aplicarPreferencias,exportar:exportarReservas,borrar:async()=>{reservas=[];ventas=[];await guardar();pintarSnacks();actualizarPaginas();actualizarUnidades();toast('Reservas y ventas borradas.');},retencion:async dias=>{if(!dias)return;const limite=Date.now()-dias*86400000;reservas=reservas.filter(r=>Date.parse(r.fin)>=limite);await guardar();}});
  });
  window.addEventListener('wg:vista',async()=>{if(document.body.dataset.pantalla==='contactos'){const modulo=await import('./contactos.js').catch(()=>null);if(modulo)modulo.completarContactos();else toast('No se pudieron cargar los enlaces de contacto.');}});
  const ampliar=document.createElement('button');ampliar.type='button';ampliar.className='btn secundario';ampliar.textContent='Necesito más tiempo';ampliar.addEventListener('click',()=>{if(pendiente){venceModal=Date.now()+30000;registrar('Tiempo de confirmación ampliado');}});document.querySelector('#modalReserva .acciones').prepend(ampliar);
  iniciarInterfaz();
  window.dispatchEvent(new Event("wg:controles-listos"));
  if(catalogoRecuperado) toast("Se recuperaron datos del catálogo local. Puedes continuar.");
  window.addEventListener("resize",actualizarPaginas);
  pintarHistorial();
  registrar("WORLD GAMES iniciado");
});

// El historial usa nodos de texto: los datos persistidos nunca se interpretan como HTML.
// El módulo secundario se solicita solo después de que exista una reserva o se abra el historial.
let versionHistorial=0;
async function pintarHistorial(){
 const lista=document.getElementById('listaHistorial');if(!lista||document.body.dataset.pantalla!=='historial')return;
 if(!reservas.length){lista.textContent='Todavía no tienes reservas guardadas en este navegador.';return;}
 const version=++versionHistorial;
 try {const modulo=await import('./historial.js');if(version===versionHistorial)modulo.pintarHistorial(reservas,equipos,productos);}
 catch{lista.textContent='No se pudo abrir el historial. Comprueba la conexión y vuelve a intentarlo.';}
}
// El estado comercial no se confunde con el indicador de conexión de la cabecera.
function actualizarHorario(){const e=document.getElementById('estadoComercial');if(!e)return;const h=estadoHorario();const texto=(h.abierto?'Abierto':'Cerrado')+' · Hoy: '+horaTexto(h.apertura)+'–'+horaTexto(h.cierre);if(e.textContent!==texto)e.textContent=texto;}
function exportarReservas(){const blob=new Blob([JSON.stringify({aplicacion:'WORLD GAMES',reservas},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='world-games-reservas.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
