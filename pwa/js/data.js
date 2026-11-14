// JSON es la fuente de datos; la copia ES permite recuperarse ante un fallo de fetch.
// Importa este módulo para reutilizar sus funciones o datos.
import * as respaldo from './data-original.js';
// Declara el dato o estado que necesitan las instrucciones siguientes.
let datos=respaldo;
// Un fallo de red no deja la pantalla esperando indefinidamente.
const controlador=new AbortController();const limite=setTimeout(()=>controlador.abort(),5000);
// Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
try{
 // Declara el dato o estado que necesitan las instrucciones siguientes.
 const respuesta=await fetch('./data/catalogos.json',{signal:controlador.signal});
 // Comprueba la condición antes de continuar con esta rama de la operación.
 if(!respuesta.ok)throw new Error('HTTP '+respuesta.status);
 // Declara el dato o estado que necesitan las instrucciones siguientes.
 const json=await respuesta.json();
 // Solo se admite el catálogo que coincide con los valores originales de esta entrega.
 // Comprueba la condición antes de continuar con esta rama de la operación.
 if(['equipos','productos','promociones','slides'].every(k=>JSON.stringify(json[k])===JSON.stringify(respaldo[k])))datos=json;
 // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
 else console.warn('Se usó el respaldo porque el JSON no coincide con el catálogo original.');
// Finaliza el ámbito de las instrucciones anteriores.
}catch(error){console.warn('Catálogo recuperado desde la copia local.',error);}
// Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
clearTimeout(limite);
export const {equipos,productos,promociones,slides}=datos;
// La capa de arranque puede explicar al usuario que se recuperó el catálogo desde el respaldo.
export const catalogoRecuperado=datos===respaldo;
