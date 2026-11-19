// Bloqueo de palabras completas: se normalizan tildes y mayúsculas sin bloquear nombres que contengan una coincidencia parcial.
const palabrasBloqueadas = new Set(['mierda', 'puta', 'puto', 'carajo', 'imbecil', 'idiota', 'estupido', 'estupida', 'pendejo', 'pendeja', 'cabron', 'cabrona', 'gilipollas', 'pelotudo', 'pelotuda', 'bastardo', 'bastarda', 'cojudo', 'cojuda', 'conchudo', 'conchuda', 'tarado', 'tarada']);
const perfilTexto = { ALLOWED_TAGS: [], ALLOWED_ATTR: [], RETURN_DOM_FRAGMENT: true };

export function textoSeguro(valor) {
  const texto = String(valor ?? '').normalize('NFC');
  const purificador = globalThis.DOMPurify;
  if (purificador?.isSupported) return purificador.sanitize(texto, perfilTexto).textContent;
  // Si el proveedor está indisponible, el texto se usa únicamente en destinos de texto o se escapa.
  return texto;
}

export function palabraBloqueada(valor) {
  return (String(valor).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().match(/\p{L}+/gu) ?? [])
    .some(palabra => palabrasBloqueadas.has(palabra));
}

export function insertarPlantilla(destino, plantilla) {
  // DOMPurify procesa el HTML generado por los catálogos antes de insertarlo.
  const purificador = globalThis.DOMPurify;
  if (purificador?.isSupported) {
    destino.append(purificador.sanitize(plantilla, { USE_PROFILES: { html: true }, RETURN_DOM_FRAGMENT: true }));
    return;
  }
  // Respaldo para la plantilla interna: el módulo de catálogos valida los atributos y escapa los textos.
  destino.insertAdjacentHTML('beforeend', plantilla);
}

// Carga DOMPurify con una versión fija sin bloquear indefinidamente una conexión lenta.
export function cargarDOMPurify() {
  if (globalThis.DOMPurify?.isSupported || !navigator.onLine) return Promise.resolve();
  return new Promise(resolve => {
    const script = document.createElement('script');
    const terminar = () => { clearTimeout(limite); resolve(); };
    const limite = setTimeout(terminar, 650);
    script.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.4.18/dist/purify.min.js';
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', terminar, { once: true });
    script.addEventListener('error', terminar, { once: true });
    document.head.append(script);
  });
}
