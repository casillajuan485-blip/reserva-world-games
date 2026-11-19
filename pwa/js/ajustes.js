import { p as preferencias, b as guardarPreferencias } from './almacenamiento.js';
import { c as confirmar, a as mostrarDialogo } from './dialogos.js';
import './persistencia-segura.js';
import './carga-catalogos.js';
import './notificaciones.js';

// Los ajustes reutilizan el modal y los controles actuales; no cambian colores, imágenes ni distribución.
async function abrirAjustes(acciones) {
 const ajustes=preferencias(),caja=document.createElement('div');
 const descripcion=document.createElement('p');descripcion.textContent='Datos guardados únicamente en este navegador. No se envían reservas a un servidor.';caja.append(descripcion);
 const controles={};
 for(const [clave,texto] of [['movimientoReducido','Reducir animaciones'],['recordarPromocion','Recordar la promoción elegida'],['bienvenida','Mostrar bienvenida al abrir']]){
  const p=document.createElement('p'),label=document.createElement('label'),input=document.createElement('input');label.className='btn secundario';input.type='checkbox';input.checked=Boolean(ajustes[clave]);label.append(input,document.createTextNode(' '+texto));p.append(label);caja.append(p);controles[clave]=input;
 }
 const conservar=document.createElement('label');conservar.textContent='Conservación de reservas: ';
 const seleccion=document.createElement('select');
 for(const [valor,texto] of [[0,'Hasta que las borre'],[30,'30 días después de finalizar'],[90,'90 días después de finalizar']]){const o=document.createElement('option');o.value=String(valor);o.textContent=texto;seleccion.append(o);}
 seleccion.value=String(ajustes.retencionDias||0);conservar.append(seleccion);caja.append(conservar);
 const info=document.createElement('p');info.textContent='El sitio sigue siendo una demostración. Al borrar las reservas se restablece su disponibilidad local.';caja.append(info);
 for(const [texto,accion] of [['Buscar actualización',()=>acciones.actualizar()],['Exportar mis reservas',()=>acciones.exportar()],['Borrar reservas y ventas',async()=>{if(await confirmar('¿Borrar todas las reservas y ventas de demostración de este navegador?')){await acciones.borrar();}}]]){
  const p=document.createElement('p'),b=document.createElement('button');b.type='button';b.className='btn secundario';b.textContent=texto;b.addEventListener('click',accion);p.append(b);caja.append(p);
 }
 // La retención solo se aplica cuando el usuario elige el plazo y confirma Guardar.
 const guardar=await mostrarDialogo('Ajustes de la aplicación',caja,[{texto:'Cancelar',valor:false},{texto:'Guardar',valor:true}]);
 if(!guardar)return;
 const siguientes=Object.fromEntries(Object.entries(controles).map(([k,v])=>[k,v.checked]));siguientes.retencionDias=Number(seleccion.value);
 if(siguientes.retencionDias>0&&siguientes.retencionDias!==(ajustes.retencionDias||0)&&!await confirmar('El nuevo plazo eliminará las reservas que lleven más de '+siguientes.retencionDias+' días finalizadas. ¿Aplicarlo?'))return;
 if(guardarPreferencias(siguientes)){acciones.preferencias(siguientes);await acciones.retencion(siguientes.retencionDias);}
 else await mostrarDialogo('No se guardaron los ajustes','El navegador no permite escribir en el almacenamiento local.');
}

export { abrirAjustes };
