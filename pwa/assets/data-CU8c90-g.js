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
const slides$1 = [
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  {
    // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
    titulo:"Bienvenido a World Games",
    // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
    descripcion:"Tu centro de entretenimiento gaming.",
    // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
    imagen:"https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1100&q=80"
  // Finaliza el ámbito de las instrucciones anteriores.
  },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  {
    // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
    titulo:"Promociones especiales",
    // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
    descripcion:"Juega y ahorra con nuestras ofertas.",
    // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
    imagen:"../img/left4_dead.jpg"
  // Finaliza el ámbito de las instrucciones anteriores.
  },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  {
    // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
    titulo:"PlayStation y Xbox",
    // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
    descripcion:"Elige el modelo y la unidad que prefieras.",
    // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
    imagen:"https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1100&q=80"
  // Finaliza el ámbito de las instrucciones anteriores.
  },
  // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
  {
    // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
    titulo:"PC Gamer",
    // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
    descripcion:"Equipos para tus sesiones de juego.",
    // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
    imagen:"../img/silent_hill.jpg"
  // Finaliza el ámbito de las instrucciones anteriores.
  }
// Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
];

const respaldo = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  equipos: equipos$1,
  productos: productos$1,
  promociones: promociones$1,
  slides: slides$1
}, Symbol.toStringTag, { value: 'Module' }));

// JSON es la fuente de datos; la copia ES permite recuperarse ante un fallo de fetch.
// Importa este módulo para reutilizar sus funciones o datos.
// Declara el dato o estado que necesitan las instrucciones siguientes.
let datos=respaldo;
// Un fallo de red no deja la pantalla esperando indefinidamente.
const controlador=new AbortController();const limite=setTimeout(()=>controlador.abort(),5000);
// Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
try{
 // Declara el dato o estado que necesitan las instrucciones siguientes.
 const respuesta=await fetch('./data/catalogos.json',{signal:controlador.signal});
 // Comprueba la condición antes de continuar con esta rama de la operación.
 if(!respuesta.ok)throw new Error('HTTP '+respuesta.status);
 // Declara el dato o estado que necesitan las instrucciones siguientes.
 const json=await respuesta.json();
 // Solo se admite el catálogo que coincide con los valores originales de esta entrega.
 // Comprueba la condición antes de continuar con esta rama de la operación.
 if(['equipos','productos','promociones','slides'].every(k=>JSON.stringify(json[k])===JSON.stringify(respaldo[k])))datos=json;
 // Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
 else console.warn('Se usó el respaldo porque el JSON no coincide con el catálogo original.');
// Finaliza el ámbito de las instrucciones anteriores.
}catch(error){console.warn('Catálogo recuperado desde la copia local.',error);}
// Ejecuta esta operación dentro del bloque actual; las instrucciones siguen el orden escrito.
clearTimeout(limite);
const {equipos,productos,promociones,slides}=datos;
// La capa de arranque puede explicar al usuario que se recuperó el catálogo desde el respaldo.
const catalogoRecuperado=datos===respaldo;

export { catalogoRecuperado, equipos, productos, promociones, slides };
