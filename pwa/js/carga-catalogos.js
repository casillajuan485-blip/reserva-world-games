// Datos exactos del ZIP original.
// Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
const equipos$1 = [
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:"ps5", categoria:"playstation", nombre:"PlayStation 5", cantidad:3, precio:40, icono:"bi-controller", imagen:"https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=600&q=75", detalle:"Consola PS5 con juegos y controles." },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:"ps4", categoria:"playstation", nombre:"PlayStation 4", cantidad:3, precio:30, icono:"bi-controller", imagen:"https://upload.wikimedia.org/wikipedia/commons/4/4a/Sony-PlayStation-4-PS4-Console-FL.png", detalle:"PlayStation 4 para juegos individuales y multijugador." },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:"ps3", categoria:"playstation", nombre:"PlayStation 3", cantidad:2, precio:20, icono:"bi-controller", imagen:"https://upload.wikimedia.org/wikipedia/commons/1/13/Sony-PlayStation-PS3-Slim-Console-FL.jpg", detalle:"Disfruta de títulos clásicos." },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:"pcg", categoria:"pc", nombre:"PC Gamer", cantidad:12, precio:25, icono:"bi-pc-display", imagen:"https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=600&q=75", detalle:"Computadora con periféricos gaming." },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:"pcn", categoria:"pc", nombre:"PC Normal", cantidad:8, precio:12, icono:"bi-display", imagen:"https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=600&q=75", detalle:"Navegación, ofimática y trabajos." },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:"xsx", categoria:"xbox", nombre:"Xbox Series X", cantidad:2, precio:35, icono:"bi-controller", imagen:"https://upload.wikimedia.org/wikipedia/commons/1/12/Xbox_Series_X_2.jpg", detalle:"Consola Xbox Series X." },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:"xss", categoria:"xbox", nombre:"Xbox Series S", cantidad:2, precio:25, icono:"bi-controller", imagen:"https://upload.wikimedia.org/wikipedia/commons/5/54/Xbox_Series_S_with_controller.jpg", detalle:"Consola Xbox Series S." },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:"arc", categoria:"arcade", nombre:"Arcade Retro", cantidad:4, precio:15, icono:"bi-joystick", imagen:"https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=75", detalle:"Máquinas Arcade y juegos retro." },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:"int", categoria:"internet", nombre:"Internet / Navegación", cantidad:8, precio:10, icono:"bi-globe", imagen:"https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=600&q=75", detalle:"Puestos de Internet independientes en esta simulación." }
// Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
];
// Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
const productos$1 = [
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:1, nombre:"Hamburguesa Gamer", tipo:"comidas", precio:25, stock:20, imagen:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=75" },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:2, nombre:"Papas fritas", tipo:"comidas", precio:15, stock:35, imagen:"https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=500&q=75" },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:3, nombre:"Nachos", tipo:"comidas", precio:18, stock:18, imagen:"https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=500&q=75" },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:4, nombre:"Gaseosa", tipo:"bebidas", precio:8, stock:50, imagen:"https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=500&q=75" },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:5, nombre:"Café", tipo:"bebidas", precio:12, stock:25, imagen:"https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=500&q=75" },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:6, nombre:"Combo Gamer 1", tipo:"combos", precio:35, stock:10, imagen:"https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=500&q=75" },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:7, nombre:"Combo Gamer 2", tipo:"combos", precio:45, stock:8, imagen:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=75" },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:8, nombre:"Combo Gamer 3", tipo:"combos", precio:55, stock:6, imagen:"https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=500&q=75" }
// Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
];
// Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
const promociones$1 = [
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:1, nombre:"1 hora de juego + gaseosa", dias:3, minutos:60, gaseosas:1, descuento:5, descripcion:"1 hora de juego en un equipo + 1 gaseosa.", imagen:"imagenes/promo-refresco.svg" },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:2, nombre:"2 horas de juego + 2 gaseosas", dias:3, minutos:120, gaseosas:2, descuento:5, descripcion:"2 horas de juego en un equipo + 2 gaseosas.", imagen:"imagenes/promo-2.svg" },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:3, nombre:"3 horas de juego + 3 gaseosas", dias:3, minutos:180, gaseosas:3, descuento:5, descripcion:"3 horas de juego en un equipo + 3 gaseosas.", imagen:"imagenes/promo-3.svg" },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  { id:4, nombre:"4 horas de juego + 4 gaseosas", dias:3, minutos:240, gaseosas:4, descuento:5, descripcion:"4 horas de juego en un equipo + 4 gaseosas.", imagen:"imagenes/promo-4.svg" }
// Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
];
// Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
// Cada sección se descarga en su propio JSON. Una sección con errores conserva su respaldo local.
const dominios = new Set(['images.unsplash.com', 'upload.wikimedia.org']);
const tipoSeguro = valor => typeof valor === 'string' && /^[a-z0-9-]{1,35}$/.test(valor);
const entero = (valor, min, max) => Number.isInteger(valor) && valor >= min && valor <= max;
const monto = valor => typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor <= 10000;
const texto = (valor, limite) => typeof valor === 'string' && valor.trim().length > 0 && valor.length <= limite;
const imagenValida = valor => {
  if (typeof valor !== 'string' || /["'<>\s]/.test(valor)) return false;
  if (/^imagenes\/[a-z0-9-]+\.(?:svg|png|jpg|webp)$/i.test(valor)) return true;
  try { const url = new URL(valor); return url.protocol === 'https:' && dominios.has(url.hostname) && !url.username && !url.password; }
  catch { return false; }
};
const comun = dato => dato && texto(dato.nombre,120) && imagenValida(dato.imagen);

const validarEquipo = dato => comun(dato) && tipoSeguro(dato.id) && tipoSeguro(dato.categoria) &&
  entero(dato.cantidad,1,100) && monto(dato.precio) && tipoSeguro(dato.icono) && texto(dato.detalle,600);
const validarProducto = dato => comun(dato) && entero(dato.id,1,10000) && tipoSeguro(dato.tipo) &&
  monto(dato.precio) && entero(dato.stock,0,10000);
const validarPromocion = dato => comun(dato) && entero(dato.id,1,10000) &&
  entero(dato.dias,1,365) && entero(dato.minutos,10,480) && dato.minutos%10===0 &&
  monto(dato.descuento) && entero(dato.gaseosas,0,100) && texto(dato.descripcion,600) &&
  (dato.dosEstaciones === undefined || typeof dato.dosEstaciones === 'boolean');

async function cargar(nombre, respaldo, validar) {
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), 3500);
  try {
    const respuesta = await fetch('./data/' + nombre + '.json', { signal: controlador.signal });
    if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
    const lista = await respuesta.json();
    if (!Array.isArray(lista) || !lista.length || lista.length > 150 || !lista.every(validar) ||
        new Set(lista.map(item => item.id)).size !== lista.length) throw new Error('Catálogo inválido');
    return { lista, recuperado: false };
  } catch {
    return { lista: respaldo, recuperado: true };
  } finally {
    clearTimeout(limite);
  }
}

const [eq, pr, po] = await Promise.all([
  cargar('equipos', equipos$1, validarEquipo),
  cargar('snacks', productos$1, validarProducto),
  cargar('promociones', promociones$1, validarPromocion)
]);
const equipos = eq.lista;
const productos = pr.lista;
const promociones = po.lista;
const catalogoRecuperado = [eq,pr,po].some(seccion => seccion.recuperado);
export { equipos, productos, promociones, catalogoRecuperado };
