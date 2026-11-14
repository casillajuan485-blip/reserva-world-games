import './vendor/jquery.js';
// El indicador utiliza el toast existente y no añade estilos a la interfaz aprobada.
const aviso=document.getElementById('toast');aviso.textContent='Cargando WORLD GAMES…';window.jQuery(aviso).show();
try {
 await import('./app.js');
 window.jQuery(aviso).hide();
 const {catalogoRecuperado}=await import('./data.js');
 if(catalogoRecuperado){aviso.textContent='Se recuperó el catálogo local. Puedes continuar usando WORLD GAMES.';window.jQuery(aviso).show();}
} catch(error) {
 aviso.textContent='No se pudo iniciar WORLD GAMES. Revisa la conexión y vuelve a abrir la página.';window.jQuery(aviso).show();console.error(error);
}
