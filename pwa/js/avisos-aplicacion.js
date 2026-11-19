// El aviso espera el login y conserva el evento nativo hasta que el usuario toca Instalar.
export function iniciarInstalacion() {
  const aviso = document.querySelector("#ofertaInstalacion");
  const texto = aviso.querySelector("#textoInstalacion");
  const accion = aviso.querySelector("[data-instalar]");
  let solicitud, acceso = false, mostrado = false, temporizador;
  const esIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const ocultar = () => { clearTimeout(temporizador); aviso.hidden = true; };

  function sugerir() {
    if (!acceso || mostrado || (!solicitud && !esIOS) ||
        matchMedia("(display-mode: standalone)").matches || navigator.standalone) return;
    texto.textContent = "Instala WORLD GAMES para abrirlo desde tu pantalla de inicio.";
    accion.textContent = solicitud ? "Instalar" : "Ver pasos";
    accion.hidden = false;
    mostrado = true;
    aviso.hidden = false;
    temporizador = setTimeout(ocultar, 5000);
  }

  // El diálogo nativo debe abrirse desde el clic. En iOS se muestran los pasos de Safari.
  accion.addEventListener("click", async () => {
    clearTimeout(temporizador);
    const evento = solicitud;
    solicitud = undefined;
    accion.hidden = true;
    if (!evento) {
      texto.textContent = "En Safari, toca Compartir → Añadir a pantalla de inicio.";
      return;
    }
    try {
      await evento.prompt();
      ocultar();
    } catch {
      texto.textContent = "Abre el menú del navegador y elige Instalar aplicación o Añadir a pantalla de inicio.";
    }
  });

  window.addEventListener("beforeinstallprompt", evento => {
    evento.preventDefault();
    solicitud = evento;
    sugerir();
  });
  window.addEventListener("wg:acceso-exitoso", () => { acceso = true; sugerir(); });
  window.addEventListener("wg:salida", () => { acceso = false; ocultar(); });
  aviso.querySelector("[data-cerrar-instalacion]").addEventListener("click", ocultar);
  window.addEventListener("appinstalled", () => { solicitud = undefined; mostrado = true; ocultar(); });
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

