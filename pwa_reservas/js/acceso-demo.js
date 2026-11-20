import { conectarSupabase } from './supabase-api.js';
import { seleccionarCuentaLocal } from './persistencia-segura.js';

export async function iniciarAcceso() {
  const puerta = document.querySelector('#accesoDemo');
  const formulario = puerta.querySelector('form');
  const mensaje = document.querySelector('#estadoAcceso');
  const salir = document.querySelector('#salirDemo');
  const vistas = [...document.querySelectorAll('header, main, footer')];
  const bloquear = estado => {
    vistas.forEach(vista => { vista.inert = estado; });
    document.body.classList.toggle('acceso-bloqueado', estado);
  };
  try {
    sessionStorage.removeItem('wg_demo_usuarios_v1');
    sessionStorage.removeItem('wg_demo_sesion_v1');
  } catch {}
  bloquear(true);

  // El módulo de reservas se carga después de seleccionar el espacio local de la cuenta.
  function abrir(usuario, desdeFormulario) {
    seleccionarCuentaLocal(usuario.id);
    window.addEventListener('wg:controles-listos', () => {
      puerta.hidden = true;
      bloquear(false);
      document.querySelector('#vista-inicio button')?.focus();
    }, {once:true});
    if (desdeFormulario) window.addEventListener('wg:controles-listos', () => window.dispatchEvent(new Event('wg:acceso-exitoso')), {once:true});
  }

  let api;
  try { api = await conectarSupabase(); }
  catch (error) {
    mensaje.textContent = error.message;
    throw error;
  }

  salir.addEventListener('click', async () => {
    salir.disabled = true;
    const {error} = await api.auth.signOut({scope:'local'}).catch(error => ({error}));
    if (error) {
      salir.disabled = false;
      document.querySelector('#estadoSalida').textContent = 'No se pudo cerrar la sesión. Inténtalo otra vez.';
      return;
    }
    location.reload();
  });

  const {data} = await api.auth.getSession();
  if (data?.session?.user) { abrir(data.session.user, false); return; }
  formulario.elements.usuario.focus();

  await new Promise(resolve => {
    formulario.addEventListener('submit', async evento => {
      evento.preventDefault();
      const botones = [...formulario.querySelectorAll('button[type=submit]')];
      if (botones.some(boton => boton.disabled)) return;
      const email = formulario.elements.usuario.value.trim();
      const password = formulario.elements.clave.value;
      const registrar = evento.submitter?.value === 'crear';
      if (password.length < 8) { mensaje.textContent = 'Usa al menos 8 caracteres.'; return; }

      botones.forEach(boton => { boton.disabled = true; });
      mensaje.textContent = 'Conectando con Supabase…';
      try {
        const respuesta = registrar
          ? await api.auth.signUp({email, password, options:{emailRedirectTo:location.origin + location.pathname}})
          : await api.auth.signInWithPassword({email, password});
        if (respuesta.error) {
          mensaje.textContent = registrar ? 'No se pudo registrar. Revisa los datos o intenta más tarde.' : 'No se pudo entrar. Verifica el correo, la contraseña y la confirmación del correo.';
          return;
        }
        formulario.reset();
        if (!respuesta.data.session) {
          mensaje.textContent = 'Revisa tu correo para confirmar la cuenta. Después, vuelve y elige Entrar.';
          return;
        }
        mensaje.textContent = '';
        abrir(respuesta.data.session.user, true);
        resolve();
      } catch {
        mensaje.textContent = 'No se pudo conectar a Supabase. Revisa tu conexión e inténtalo de nuevo.';
      } finally {
        botones.forEach(boton => { boton.disabled = false; });
      }
    });
  });
}
