import './vendor/jquery.js';
import {notificar,ocultarAviso} from './notificaciones.js';
// La carga usa un mensaje en su propia fila y se retira cuando está lista la aplicación.
notificar('Cargando WORLD GAMES…',{duracion:0});
try{
 await import('./app.js');ocultarAviso();
 const {catalogoRecuperado}=await import('./data.js');
 if(catalogoRecuperado)notificar('Se recuperó el catálogo local. Puedes continuar usando WORLD GAMES.');
}catch(error){notificar('No se pudo iniciar WORLD GAMES. Revisa la conexión y vuelve a abrir la página.',{duracion:0});console.error(error);}
