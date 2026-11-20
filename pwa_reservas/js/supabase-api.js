
let cliente;
export async function conectarSupabase() {
  const {supabaseUrl, supabasePublishableKey} = await import(new URL("js/supabase-config.js", document.baseURI).href);
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(supabaseUrl) ||
      !supabasePublishableKey.startsWith('sb_publishable_')) {
    throw new Error('Configura la URL del proyecto y la clave publicable en js/supabase-config.js.');
  }
  cliente ??= import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.89.0/+esm')
    .then(({createClient}) => createClient(supabaseUrl, supabasePublishableKey, {
      auth: {storage: sessionStorage, storageKey: 'wg_supabase_auth'}
    })).catch(error => { cliente = undefined; throw error; });
  return cliente;
}

// PostgreSQL confirma todas las unidades juntas y decide si el horario sigue disponible.
export async function confirmarReservaRemota(reserva) {
  const api = await conectarSupabase();
  const {data, error} = await api.rpc('confirmar_reserva', {
    p_codigos: reserva.unidades,
    p_inicio: reserva.inicio,
    p_fin: reserva.fin
  });
  if (error) throw error;
  if (!Array.isArray(data) || data.length !== reserva.unidades.length) {
    throw new Error('Respuesta de reserva inesperada');
  }
  return data.map(fila => fila.id);
}
