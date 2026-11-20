import { claveDeCuenta, l as leerLocal, v as validarEstado, e as escribirLocal } from './persistencia-segura.js';
import { equipos, productos } from './carga-catalogos.js';

let base=null;
// La conexión se comparte; cada transacción conserva las reservas y las ventas en el mismo objeto atómico.
async function abrirBase() {
  if(base)return base;
  base=await new Promise((resolve,reject)=>{
    const solicitud=indexedDB.open(claveDeCuenta('world-games-pwa'),1);
    solicitud.onupgradeneeded=()=>{if(!solicitud.result.objectStoreNames.contains('estado'))solicitud.result.createObjectStore('estado');};
    solicitud.onsuccess=()=>{const db=solicitud.result;db.onversionchange=()=>{db.close();base=null;};resolve(db);};
    solicitud.onerror=()=>reject(solicitud.error);
    solicitud.onblocked=()=>reject(new Error('Cierra otras pestañas de WORLD GAMES para actualizar los datos.'));
  });
  return base;
}
// Esperar al cierre de la transacción impide mostrar una confirmación antes de que la reserva esté guardada.
async function transaccion(modo,operacion) {
  const db=await abrirBase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('estado',modo);let resultado;
    const peticion=operacion(tx.objectStore('estado'));
    peticion.onsuccess=()=>{resultado=peticion.result;};
    tx.oncomplete=()=>resolve(resultado);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
}
// Al actualizar desde versiones antiguas se migran una sola vez los datos locales, sin borrarlos.
async function cargarEstado() {
  const anterior={reservas:leerLocal('wg2_reservas',[]),ventas:leerLocal('wg2_ventas',[]),carrito:leerLocal('wg2_carrito',[])};
  let resultado;
  try { resultado=await transaccion('readonly',s=>s.get('actual')); }
  catch { resultado=null; }
  const limpio=validarEstado(resultado||anterior,equipos,productos);
  // El plazo opcional se vuelve a comprobar al abrir la PWA, no únicamente cuando se elige el ajuste.
  const dias=Number(preferencias().retencionDias)||0;
  if(dias>0)limpio.reservas=limpio.reservas.filter(r=>Date.parse(r.fin)>=Date.now()-dias*86400000);
  // El carrito es pequeño y permanece en localStorage; las reservas y ventas se recuperan de IndexedDB.
  limpio.carrito=validarEstado({carrito:anterior.carrito},equipos,productos).carrito;
  if(!resultado||dias>0)await guardarEstado(limpio);
  return limpio;
}
// Una copia local permite recuperarse si IndexedDB está deshabilitado o se llena su cuota.
async function guardarEstado(estado) {
  const limpio=validarEstado(estado,equipos,productos);
  const respaldo=escribirLocal('wg2_reservas',limpio.reservas)&&escribirLocal('wg2_ventas',limpio.ventas);
  escribirLocal('wg2_carrito',limpio.carrito);
  try { await transaccion('readwrite',s=>s.put({...limpio,actualizado:Date.now()},'actual'));return true; }
  catch { return respaldo; }
}
function cerrarAlmacenamiento() { if(base){base.close();base=null;} }
// Las preferencias no cambian colores, tipografía ni disposición: solo comportamientos de la aplicación.
function preferencias() { return {movimientoReducido:false,recordarPromocion:true,bienvenida:true,...leerLocal('wg_preferencias',{})}; }
function guardarPreferencias(datos) { return escribirLocal('wg_preferencias',datos); }

export { cerrarAlmacenamiento as a, guardarPreferencias as b, cargarEstado as c, guardarEstado as g, preferencias as p };
