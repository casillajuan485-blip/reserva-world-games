// Registra métricas del navegador para la defensa. Los resultados permanecen en esta página.
export async function iniciarMetricas() {
  const metricas = window.worldGamesMetricas = {};
  const registrar = ({ name, value }) => {
    metricas[name] = Number(value.toFixed(3));
    window.dispatchEvent(new CustomEvent('wg:metrica', { detail: { nombre: name, valor: metricas[name] } }));
  };
  try {
    if (!navigator.onLine) throw new Error("Modo sin conexión");
    let limite;
    const proveedor = import('https://cdn.jsdelivr.net/npm/web-vitals@6.2.3/dist/web-vitals.js');
    const espera = new Promise((_,rechazar)=>{limite=setTimeout(()=>rechazar(new Error('Proveedor no disponible')),1400);});
    const { onCLS, onLCP, onINP } = await Promise.race([proveedor,espera]).finally(()=>clearTimeout(limite));
    const opciones = { reportAllChanges: true };
    onCLS(registrar, opciones);
    onLCP(registrar, opciones);
    onINP(registrar, opciones);
  } catch {
    // Seguimiento local mediante PerformanceObserver cuando la biblioteca externa no está disponible.
    const observar = (tipo, procesar, opciones = {}) => {
      if (!globalThis.PerformanceObserver?.supportedEntryTypes.includes(tipo)) return;
      const observador = new PerformanceObserver(lista => procesar(lista.getEntries()));
      observador.observe({ type: tipo, buffered: true, ...opciones });
      return observador;
    };
    const lcp = observar('largest-contentful-paint', entradas => {
      const entrada = entradas.at(-1);
      if (entrada) registrar({ name: 'LCP', value: entrada.startTime });
    });
    let inicio = 0, anterior = 0, sesion = 0, mejor = 0;
    const cls = observar('layout-shift', entradas => {
      for (const entrada of entradas) {
        if (entrada.hadRecentInput) continue;
        const tiempo = entrada.startTime;
        if (sesion && tiempo - anterior < 1000 && tiempo - inicio < 5000) sesion += entrada.value;
        else { sesion = entrada.value; inicio = tiempo; }
        anterior = tiempo;
        mejor = Math.max(mejor, sesion);
      }
      registrar({ name: 'CLS', value: mejor });
    });
    const interacciones = new Map();
    let menorIdentificador = Infinity, mayorIdentificador = 0;
    const inp = observar('event', entradas => {
      for (const evento of entradas) {
        if (!evento.interactionId) continue;
        menorIdentificador = Math.min(menorIdentificador, evento.interactionId);
        mayorIdentificador = Math.max(mayorIdentificador, evento.interactionId);
        interacciones.set(evento.interactionId, Math.max(evento.duration, interacciones.get(evento.interactionId) ?? 0));
      }
      const lentas = [...interacciones].sort((a, b) => b[1] - a[1]).slice(0, 10);
      interacciones.clear();
      lentas.forEach(([id, tiempo]) => interacciones.set(id, tiempo));
      const total = performance.interactionCount ?? (mayorIdentificador - menorIdentificador) / 7 + 1;
      if (lentas.length) registrar({ name: 'INP', value: lentas[Math.min(lentas.length - 1, Math.floor(total / 50))][1] });
    }, { durationThreshold: 16 });
    window.addEventListener('pagehide', () => [lcp, cls, inp].forEach(o => o?.disconnect()), { once: true });
  }
}

