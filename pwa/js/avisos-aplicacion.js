// Conecta el banner de cinco segundos con el acceso exitoso. La disponibilidad puede llegar antes o después del login.
export function iniciarInstalacion() {
  const aviso = document.querySelector("#ofertaInstalacion");
  let disponible = false, acceso = false, mostrado = false, temporizador;
  const esIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const ocultar = () => { clearTimeout(temporizador); aviso.hidden = true; };
  function sugerir() {
    if (!acceso || mostrado || (!disponible && !esIOS) || matchMedia("(display-mode: standalone)").matches || navigator.standalone) return;
    aviso.querySelector("#textoInstalacion").textContent = esIOS ? "En Safari, toca Compartir → Añadir a pantalla de inicio." : "Puedes instalar WORLD GAMES desde el menú de tu navegador.";
    mostrado = true; aviso.hidden = false;
    temporizador = setTimeout(ocultar, 5000);
  }
  window.addEventListener("beforeinstallprompt", evento => { evento.preventDefault(); disponible = true; sugerir(); });
  window.addEventListener("wg:acceso-exitoso", () => { acceso = true; sugerir(); });
  window.addEventListener("wg:salida", () => { acceso = false; ocultar(); });
  aviso.querySelector("[data-cerrar-instalacion]").addEventListener("click", ocultar);
  window.addEventListener("appinstalled", () => { mostrado = true; ocultar(); });
  window.addEventListener("pagehide", ocultar);
}

// Tras persistir la reserva, el aviso se presenta sobre Inicio y se retira automáticamente.
let temporizadorExito;
export function mostrarReservaGuardada(codigo) {
  const aviso = document.querySelector('#reservaGuardada');
  aviso.hidden = false;
  aviso.querySelector('span').textContent = 'Código de reserva ' + codigo;
  clearTimeout(temporizadorExito);
  temporizadorExito = setTimeout(() => { aviso.hidden = true; }, 5500);
}
window.addEventListener('pagehide', () => clearTimeout(temporizadorExito));
