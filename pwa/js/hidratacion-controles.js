// Asocia el HTML estático con sus manejadores y reconoce los controles nuevos por delegación.
export function hidratarControles(raiz = document.body) {
  const selector = 'button, input, select, textarea, a[href], [role="button"]';
  let listo = false;
  window.addEventListener('wg:controles-listos',()=>{ listo=true; marcar(raiz); },{once:true});
  const marcar = nodo => {
    if (!(nodo instanceof Element)) return;
    const marcarControl = control => {
      // Los controles del juego quedan inertes hasta que el módulo principal conecte sus eventos.
      if (control.closest('main,header,footer') && !listo) return;
      control.dataset.hidratado = 'true';
    };
    if (nodo.matches(selector)) marcarControl(nodo);
    nodo.querySelectorAll(selector).forEach(marcarControl);
  };
  marcar(raiz);
  const observador = new MutationObserver(cambios => {
    for (const cambio of cambios) cambio.addedNodes.forEach(marcar);
  });
  const conectar = () => {
    marcar(raiz);
    observador.observe(raiz, { childList: true, subtree: true });
  };
  conectar();
  window.addEventListener('pagehide', () => observador.disconnect());
  window.addEventListener('pageshow', conectar);
}
