import { palabraBloqueada, textoSeguro } from './seguridad-formularios.js';

// Acceso simulado. Las cuentas viven en este arreglo y se recuperan durante la sesión de esta pestaña.
const usuarios = [];
const claveUsuarios = 'wg_demo_usuarios_v1';
const claveSesion = 'wg_demo_sesion_v1';

function leer(clave, respaldo) {
  try { return JSON.parse(sessionStorage.getItem(clave)) ?? respaldo; }
  catch { return respaldo; }
}

function guardar(clave, valor) {
  try { sessionStorage.setItem(clave, JSON.stringify(valor)); }
  catch { /* El acceso en memoria sigue disponible. */ }
}

export function iniciarAcceso() {
  const puerta = document.querySelector('#accesoDemo');
  const formulario = puerta.querySelector('form');
  const mensaje = document.querySelector('#estadoAcceso');
  const vistas = [document.querySelector('header'), document.querySelector('main'), document.querySelector('footer')].filter(Boolean);
  const recuperados = leer(claveUsuarios, []);
  if (Array.isArray(recuperados)) usuarios.push(...recuperados.filter(u => typeof u?.nombre === 'string' && typeof u?.clave === 'string'));
  const sesion = leer(claveSesion, '');
  let usuarioActual = usuarios.find(u => u.nombre === sesion);
  let controlesListos = false;
  window.addEventListener("wg:controles-listos",()=>{ controlesListos=true; mostrarPuerta(!usuarioActual); },{once:true});

  function mostrarPuerta(visible) {
    puerta.hidden = !visible;
    vistas.forEach(vista => { vista.inert = visible || !controlesListos; });
    document.body.classList.toggle('acceso-bloqueado', visible);
    if (visible) formulario.elements.usuario.focus();
    else if (controlesListos) document.querySelector("#vista-inicio button")?.focus();
  }

  mostrarPuerta(!usuarioActual);

  return new Promise(resolve => {
    if (usuarioActual) resolve();
    // El formulario distingue registro e inicio de sesión por el botón utilizado.
    formulario.addEventListener('submit', evento => {
      evento.preventDefault();
      const campo = formulario.elements.usuario;
      const nombre = textoSeguro(campo.value.trim()).toLowerCase();
      const clave = formulario.elements.clave.value;
      const registrar = evento.submitter?.value === 'crear';
      const cuenta = usuarios.find(u => u.nombre === nombre);
      let error = '';
      if (nombre !== campo.value.trim().normalize('NFC').toLowerCase() || !/^[\p{L}\p{N}_-]{3,24}$/u.test(nombre) || palabraBloqueada(nombre)) error = 'Usa un nombre apropiado de 3 a 24 caracteres.';
      else if (clave.length < 6 || clave.length > 64) error = 'Escribe entre 6 y 64 caracteres.';
      else if (registrar && cuenta) error = 'Ese usuario ya existe. Elige Entrar.';
      else if (!registrar && cuenta?.clave !== clave) error = 'El usuario o la contraseña de práctica no coinciden.';
      mensaje.textContent = error;
      if (error) return;

      usuarioActual = cuenta ?? { nombre, clave };
      if (registrar) {
        usuarios.push(usuarioActual);
        guardar(claveUsuarios, usuarios);
      }
      guardar(claveSesion, nombre);
      formulario.reset();
      mostrarPuerta(false);
      window.dispatchEvent(new Event("wg:acceso-exitoso"));
      resolve();
    });

    document.querySelector('#salirDemo').addEventListener('click', () => {
      usuarioActual = null;
      guardar(claveSesion, '');
      window.dispatchEvent(new Event('wg:salida'));
      document.querySelector('.nav-link[data-vista="inicio"]')?.click();
      mostrarPuerta(true);
    });
  });
}
