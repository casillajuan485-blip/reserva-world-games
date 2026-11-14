// Las claves locales siguen siendo compatibles con las entregas anteriores; nunca se evalúa su contenido.
export function leerLocal(clave, defecto=null) {
  try { const valor=localStorage.getItem(clave); return valor===null?defecto:JSON.parse(valor); }
  catch { return defecto; }
}
// Devuelve éxito o fallo para que un navegador sin cuota no provoque una excepción sin gestionar.
export function escribirLocal(clave,valor) {
  try { localStorage.setItem(clave,JSON.stringify(valor)); return true; }
  catch { return false; }
}
// Solo se borran claves propias de WORLD GAMES, nunca los datos de otras aplicaciones del mismo origen.
export function quitarLocal(clave) { try { localStorage.removeItem(clave); } catch {} }
// Escapa las cinco entidades que pueden convertir texto de un formulario en marcado ejecutable.
export function escapar(texto) {
  return String(texto??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
// Los enlaces de Contactos son páginas públicas de las aplicaciones, no perfiles ficticios inventados.
const dominios=new Set(['www.facebook.com','www.instagram.com','www.tiktok.com','www.whatsapp.com','www.google.com']);
export function enlaceSeguro(valor) {
  try { const url=new URL(valor,location.href); return url.protocol==='https:'&&dominios.has(url.hostname)?url.href:null; }
  catch { return null; }
}
// Valida también los datos recuperados de almacenamiento, porque el navegador permite modificarlos manualmente.
export function validarEstado(valor,equipos,productos) {
  const unidades=new Set(equipos.flatMap(e=>Array.from({length:e.cantidad},(_,i)=>e.id.toUpperCase()+'-'+String(i+1).padStart(2,'0'))));
  const items=lista=>Array.isArray(lista)?lista.filter(x=>x&&productos.some(p=>p.id===x.id)&&Number.isInteger(x.cantidad)&&x.cantidad>0&&x.cantidad<=100):[];
  const reservas=Array.isArray(valor?.reservas)?valor.reservas.filter(r=>r&&typeof r.id==='string'&&Array.isArray(r.unidades)&&r.unidades.length>0&&r.unidades.every(u=>unidades.has(u))&&Number.isFinite(Date.parse(r.inicio))&&Date.parse(r.fin)>Date.parse(r.inicio)&&Number.isInteger(r.totalCentavos)&&r.totalCentavos>=0).map(r=>({...r,items:items(r.items),incluidos:items(r.incluidos)})):[];
  return {reservas,ventas:items(valor?.ventas),carrito:items(valor?.carrito)};
}
