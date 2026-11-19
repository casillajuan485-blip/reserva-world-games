import { textoSeguro } from './seguridad-formularios.js';
import { a as mostrarDialogo } from './dialogos.js';
import './notificaciones.js';

// Este módulo se descarga solo cuando se consulta el historial o debe actualizarse su lista.
const acciones = new WeakMap();
function pintarHistorial(reservas,equipos,productos) {
  const lista=document.getElementById('listaHistorial');if(!lista)return;
  const fragmento=document.createDocumentFragment();
  if(!reservas.length){const p=document.createElement('p');p.textContent='Todavía no tienes reservas guardadas en este navegador.';fragmento.append(p);}
  reservas.slice().reverse().forEach(r=>{
    const modelo=equipos.find(e=>e.id===r.modelo||r.unidades.some(u=>u.startsWith(e.id.toUpperCase()+'-')));
    const inicio=new Date(r.inicio),fin=new Date(r.fin),minutos=r.minutos||Math.round((fin-inicio)/60000);
    const tarjeta=document.createElement('article');tarjeta.className='panel historial__reserva';tarjeta.tabIndex=0;tarjeta.setAttribute('role','button');
    tarjeta.setAttribute('aria-label','Abrir detalles de '+(modelo?.nombre||r.unidades.join(', '))+' · '+r.id);
    const titulo=document.createElement('h2');titulo.textContent=modelo?.nombre||r.unidades.join(', ');
    const datos=document.createElement('p');datos.textContent=`${r.unidades.join(', ')} · ${inicio.toLocaleDateString('es-BO')} · ${inicio.toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})}–${fin.toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'})} · ${minutos} min`;
    const estado=document.createElement('p');estado.textContent=`Bs ${(r.totalCentavos/100).toFixed(2)} · ${fin<new Date()?'Finalizada':'Confirmada'}`;
    tarjeta.append(titulo,datos,estado);
    const abrir=()=>detalleReserva(r,modelo,productos);
    acciones.set(tarjeta,abrir);
    fragmento.append(tarjeta);
  });
  lista.replaceChildren(fragmento);
  // Un solo manejador delegado atiende cualquier tarjeta actual o futura.
  const selector = 'article.historial__reserva';
  window.jQuery(lista).off('click.wgHistorial keydown.wgHistorial',selector).on('click.wgHistorial keydown.wgHistorial',selector,function(evento){
    if(evento.type==='keydown' && !['Enter',' '].includes(evento.key)) return;
    if(evento.type==='keydown') evento.preventDefault();
    acciones.get(this)?.();
  });
}
// Los detalles incluyen toda la reserva y usan únicamente textContent para las entradas personales.
function detalleReserva(r,modelo,productos) {
  const caja=document.createElement('div');
  const valores=[['Código',r.id],['Equipo',modelo?.nombre||r.modelo],['Unidad',r.unidades.join(', ')],['Cliente',[r.nombre,r.apellido].filter(Boolean).join(' ')],['Correo',r.correo||'—'],['Celular',r.telefono||'—'],['Inicio',new Date(r.inicio).toLocaleString('es-BO')],['Fin',new Date(r.fin).toLocaleString('es-BO')],['Duración',(r.minutos||Math.round((Date.parse(r.fin)-Date.parse(r.inicio))/60000))+' minutos'],['Juego','Bs '+((r.juegoCentavos||0)/100).toFixed(2)],['Snacks','Bs '+((r.snacksCentavos||0)/100).toFixed(2)],['Descuento','Bs '+((r.descuentoCentavos||0)/100).toFixed(2)],['Total','Bs '+(r.totalCentavos/100).toFixed(2)]];
  valores.forEach(([etiqueta,valor])=>{const fila=document.createElement('p');const titulo=document.createElement('strong');titulo.textContent=etiqueta+': ';fila.append(titulo,document.createTextNode(String(valor??'—')));caja.append(fila);});
  (r.items||[]).forEach(item=>{const p=productos.find(p=>p.id===item.id);if(p){const fila=document.createElement('p');fila.textContent=`${item.cantidad} × ${p.nombre} · Bs ${(p.precio*item.cantidad).toFixed(2)}`;caja.append(fila);}});
  return mostrarDialogo('Detalle de reserva',caja);
}

export { pintarHistorial };
