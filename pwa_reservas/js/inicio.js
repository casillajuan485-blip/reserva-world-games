import { iniciarAcceso } from './acceso-demo.js';
import { iniciarInstalacion } from './avisos-aplicacion.js';
import { hidratarControles } from './hidratacion-controles.js';
import { cargarDOMPurify } from './seguridad-formularios.js';

// Prepara el modo offline y la oferta de instalación desde la primera visita.
iniciarInstalacion();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.warn);

// Las imágenes remotas conservan su aspecto original cuando están disponibles y tienen respaldo local.
document.addEventListener('error', evento => {
  const imagen = evento.target;
  if (!(imagen instanceof HTMLImageElement) || !imagen.dataset.respaldoImagen) return;
  const respaldo = imagen.dataset.respaldoImagen;
  delete imagen.dataset.respaldoImagen;
  imagen.src = respaldo;
}, true);

// Utiliza un módulo secundario para medir rendimiento después del contenido prioritario.
const iniciarMedicion = () => import('./metricas-web.js').then(modulo => modulo.iniciarMetricas()).catch(console.warn);
if ('requestIdleCallback' in window) requestIdleCallback(iniciarMedicion, { timeout: 1500 });
else setTimeout(iniciarMedicion, 400);

// El HTML inicial recibe los eventos de acceso sin esperar a los catálogos.
const seguridadLista = cargarDOMPurify();
hidratarControles();

try {
  await iniciarAcceso();
  await seguridadLista;
  await import('./reservas-catalogos.js');
} catch (error) {
  document.querySelector('#conexion').textContent = 'No se pudo iniciar WORLD GAMES. Vuelve a cargar.';
  console.error(error);
}
