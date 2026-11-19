# WORLD GAMES · Guía para la defensa

La carpeta funciona como un sitio estático. Para publicarla, coloca su contenido en la raíz publicada de GitHub Pages. Para probarla en tu equipo, abre la carpeta en VS Code y ejecuta `index.html` con Live Server. Entra con **Crear cuenta** y una contraseña inventada de entre 6 y 64 caracteres. Las cuentas de práctica se conservan en la sesión de esa pestaña. El historial y el carrito se guardan mediante el almacenamiento local de la PWA.

## Ubicación de las funciones

| Qué mostrar | Archivo y función |
|---|---|
| HTML y estructura de la interfaz | `index.html`. Hero con horario, asistente de cuatro pasos, login, oferta de instalación y confirmación. |
| Formulario limpio desde «Reservar» | `js/reservas-catalogos.js`, `reiniciarReservaDirecta()` e `iniciarAsistente()`. El botón «Reservar» limpia los campos. Al abrir desde un equipo o promoción, la selección se transfiere a la reserva. |
| Alerta progresiva y horarios | El mismo archivo, `guiaEquipo()`, `guiaActual()`, `actualizarGuia()` y `rangoHorario()`. La última hora de inicio depende de la duración. Los horarios publicados son 10:00–22:00 de lunes a sábado y 14:00–20:00 los domingos. |
| Validaciones, rojo y verde | `validarIdentidad()` y `validarDatos()` en `js/reservas-catalogos.js`. `palabraBloqueada()` y `textoSeguro()` en `js/seguridad-formularios.js`. |
| DOMPurify y salida segura | `js/seguridad-formularios.js`, `cargarDOMPurify()` e `insertarPlantilla()`. Autorización del proveedor en la CSP del HTML. Si la CDN es inaccesible, siguen activas las validaciones del catálogo y los destinos de texto. |
| Reserva exitosa y regreso al Inicio | Manejador de `#aceptarModal` en `js/reservas-catalogos.js`. Guarda en IndexedDB o respaldo local y llama a `mostrarReservaGuardada()` de `js/avisos-aplicacion.js`. |
| Login | `js/acceso-demo.js`, `iniciarAcceso()` y el arreglo `usuarios`. Simulación de frontend. |
| Hidratación y delegación | `js/hidratacion-controles.js` espera `wg:controles-listos` y reconoce controles nuevos. Los manejadores reales se conectan en sus módulos. Busca `click.wgVinculo17` para ver `.off().on()` en los botones dinámicos de snacks. Es hidratación de HTML estático mediante JavaScript. |
| Fetch, JSON y respaldo | `js/carga-catalogos.js`, `cargar()`. Los datos se dividen en `data/equipos.json`, `data/snacks.json` y `data/promociones.json`. JSON estándar no admite comentarios. Las reglas de cada catálogo están comentadas en el módulo que los consume. |
| Imágenes y precarga | Etiqueta `preload` de la imagen principal en `index.html`. `pintarEquipos()`, `pintarSnacks()` y `pintarPromociones()` generan imágenes con tamaño, lazy loading y decodificación asíncrona. `js/inicio.js` aplica respaldo local a una imagen de catálogo si falla. |
| Especificidad y BEM | `css/componentes.css` documenta los bloques añadidos y sus variantes. Por ejemplo, `.acceso__panel` y `.reserva-ayuda--error`. El diseño base está en `css/diseno-world-games.css`. |
| PWA e instalación | `manifest.webmanifest`, `sw.js`, `iniciarInstalacion()` en `js/avisos-aplicacion.js`. La oferta superior dura 5 segundos cuando el navegador comunica que puede instalar la PWA. La sugerencia se muestra después de un acceso nuevo. En iOS indica la opción de Safari. |
| LCP, CLS e INP | `js/metricas-web.js`. Abre la consola y ejecuta `window.worldGamesMetricas`. LCP e INP se expresan en ms. CLS mide desplazamientos acumulados en su ventana de cálculo. Interactúa para obtener INP. Si la biblioteca web-vitals está indisponible se recogen estimaciones locales mediante PerformanceObserver. |
| Módulos tardíos | Ajustes, Contactos e Historial se cargan con import() cuando se utilizan. esbuild conserva esas importaciones diferidas como módulos separados. |
| Limpieza de recursos y movimiento reducido | `js/notificaciones.js` cancela las tareas y pausa relojes. `js/hidratacion-controles.js` desconecta su observador. El CSS y jQuery respetan `prefers-reduced-motion`. |

## Pruebas para mostrar en clase

1. Abre **Reservar ahora**, completa los campos paso a paso y verifica el horario. Prueba el domingo para ver un rango distinto. Confirma y revisa el mensaje en Inicio.
2. En DevTools, abre **Application → Service Workers**. Verifica que el trabajador esté activo y cambia a **Offline**. Recarga, abre Historial y consulta la reserva.
3. En **Network**, abre Contactos por primera vez. Localiza su módulo. En Equipos y Snacks revisa las solicitudes de imágenes y los atributos `loading="lazy"`.
4. En consola, consulta `window.worldGamesMetricas` y `window.DOMPurify?.version`. Si el proveedor de DOMPurify está inaccesible, la versión aparece vacía y la PWA utiliza las validaciones locales.

La carpeta `js/` contiene los archivos editables y comentados. La página publicada usa `js/compilado/inicio.js`. Estudia y edita los originales en `js/`. El formulario es una reserva de demostración y los datos residen en el navegador.

## Cómo seguir cada función desde el HTML

| Función y ubicación | Elemento HTML y cómo se conecta |
|---|---|
| inicio.js y sw.js | index.html carga js/compilado/inicio.js con type="module". Su fuente js/inicio.js registra sw.js mediante navigator.serviceWorker.register(). El trabajador precarga los módulos de js/compilado/, los estilos y los catálogos. |
| iniciarAcceso() · js/acceso-demo.js, línea 18 | Busca #accesoDemo y escucha submit del formulario. Valida sus campos, guarda la cuenta de práctica en sessionStorage y emite wg:acceso-exitoso. Mantiene la cuenta durante la sesión de la pestaña. |
| iniciarInstalacion() · js/avisos-aplicacion.js, línea 2 | inicio.js conecta #ofertaInstalacion con wg:acceso-exitoso. En navegadores compatibles espera también beforeinstallprompt. En iOS muestra instrucciones de Safari. El temporizador oculta la sugerencia en cinco segundos. Si se toca Instalar, el controlador de clic llama a prompt() en el evento guardado. En iOS, Ver pasos mantiene las indicaciones a la vista hasta cerrar el aviso. |
| rangoHorario() y actualizarGuia() · js/reservas-catalogos.js, líneas 615 y 701 | Los cambios de fecha, hora o duración actualizan #guia-horaReserva. #horaReserva lo referencia con aria-describedby. El rango del día se calcula tomando en cuenta la duración y el cierre. En Inicio, .horario-inicio presenta el horario semanal en HTML. |
| pintarEquipos() y pintarSnacks() · js/reservas-catalogos.js, líneas 993 y 1071 | Renderizan las tarjetas de #catalogoEquipos y #catalogoSnacks. El span con clase badge se dibuja sobre la imagen. css/componentes.css controla legibilidad, espacio y contraste. |
| paginar() · js/reservas-catalogos.js, línea 962 | Lee las tarjetas de cada catálogo y el filtro de categoría. Dibuja los controles en #pagEquipos, #pagSnacks y #pagPromos. Los filtros se conectan por delegación. |
| iconos() · js/reservas-catalogos.js, línea 285 | Toma los elementos i.bi con equivalencia y los convierte en SVG que apuntan a símbolos de imagenes/iconos.svg por ID. |
| palabraBloqueada() · js/seguridad-formularios.js, línea 13 | Se invoca al validar el usuario y los campos de nombre de la reserva. Normaliza tildes y mayúsculas y compara palabras completas con un Set. |
| Manifest e icono de iOS | index.html enlaza manifest.webmanifest y declara apple-touch-icon. El manifiesto incluye un icono independiente maskable y capturas para móvil y escritorio. |

Para GitHub Pages, publica el contenido de World_Games desde la raíz o la carpeta configurada en Pages. Si editas un recurso precargado después de publicar, cambia VERSION en sw.js al publicar la actualización para renovar la caché.

## Tree shaking y verificación

Se compiló con esbuild 0.25.5 desde js/inicio.js. Las opciones bundle, format=esm y splitting conservan las cargas dinámicas y tree-shaking=true permite eliminar código sin uso. El HTML carga js/compilado/inicio.js y el trabajador precarga sus módulos.

La comparación usó la misma configuración de minificación y división de módulos. Sin tree shaking resultaron 174 185 bytes y con tree shaking 172 917 bytes. La reducción fue de 1 268 bytes de JavaScript antes de la compresión HTTP.

Para recompilar desde World_Games: npx --yes esbuild@0.25.5 js/inicio.js --bundle --format=esm --splitting --minify --target=es2022 --tree-shaking=true --outdir=js/compilado. Actualiza RECURSOS con los nuevos archivos generados, cambia VERSION en sw.js y prueba una recarga sin conexión. El ZIP ya incluye la salida compilada.

## Referencias exactas para abrir en VS Code

| Archivo y línea | Función o evidencia |
|---|---|
| index.html:36 | Entrada que ejecuta el navegador en GitHub Pages. |
| index.html:680 | Acción del banner. El cierre y el aviso usan data-cerrar-instalacion y ofertaInstalacion. |
| js/avisos-aplicacion.js:2 | Conecta login, disponibilidad del navegador y botón del banner. |
| js/avisos-aplicacion.js:33 | Abre el cuadro nativo directamente desde el toque. |
| js/inicio.js:8 | Registra el Service Worker desde la página. |
| sw.js:5 | Lista de archivos offline. Incluye las salidas de esbuild y sus módulos. |
| sw.js:60 | Intercepta las peticiones y aplica la estrategia de red y caché. |
| js/hidratacion-controles.js:2 | Activa controles y observa los elementos añadidos. |
| js/reservas-catalogos.js:598 | Limpia la reserva al abrirla desde Inicio. |
| js/reservas-catalogos.js:161 | Comprueba los datos del cliente. |
| js/reservas-catalogos.js:1204 | Delegación con .off().on() para los botones dinámicos de snacks. |
| js/reservas-catalogos.js:1003 | El navegador puede aplazar las imágenes del catálogo. |
| js/carga-catalogos.js:80 | Carga los archivos JSON y usa el respaldo si falla la petición. |
| css/componentes.css:37 | La combinación de ID y clase tiene mayor especificidad que .filtro. |
| js/seguridad-formularios.js:18 | Usa DOMPurify si está disponible y conserva controles de salida. |
| js/metricas-web.js:3 | Punto de consulta de LCP, CLS e INP en consola. |
