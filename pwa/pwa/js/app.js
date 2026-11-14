import "./vendor/jquery.js";
const $ = window.jQuery;
import {notificar} from './notificaciones.js';
import {activarCampana} from './campana.js';
import {equipos,productos,promociones,slides} from "./data.js";
import {iniciarPWA,buscarActualizacion} from "./pwa.js";
import {cargarEstado,guardarEstado,preferencias,cerrarAlmacenamiento} from "./almacenamiento.js";
import {dentroHorario,estadoHorario,horaTexto} from "./horarios.js";
import {leerLocal,escribirLocal,quitarLocal} from "./seguridad.js";
import {confirmar,mostrarDialogo} from "./dialogos.js";
import {debounce,relojVisible} from "./utilidades.js";
import {validarIdentidad,regexNombre,regexCorreo} from "./validaciones.js";
import {costoMinutos,textoDuracion,totalPedido} from "./calculos.js";
// Se recuperan las reservas antes de habilitar el asistente.
const estadoInicial = await cargarEstado();
import {iniciarInterfaz} from "./ui.js";

// =====================================================
// WORLD GAMES - JAVASCRIPT + JQUERY
// Proyecto 100 % frontend
// =====================================================

// =====================================================
// 1. DATOS DE EQUIPOS
// =====================================================
// Cada modelo tiene unidades individuales con códigos.
// Los precios están expresados en bolivianos por hora.



// =====================================================
// 2. SNACKS Y STOCK
// =====================================================
// Los combos tienen inventario propio.
// La gaseosa tiene tres sabores demostrativos.



// =====================================================
// 3. PROMOCIONES
// =====================================================
// La rebaja es de Bs 5 sobre el precio normal.
// Solo se aplica cuando se selecciona una promoción.
// Un equipo por paquete: las gaseosas se agregan automáticamente.
// En esta campaña, las cuatro promociones duran tres días (72 horas).



// =====================================================
// 4. CARRUSEL PRINCIPAL
// =====================================================



// =====================================================
// 5. LOCALSTORAGE
// =====================================================
// Guarda datos solo en este navegador.
// NO sincroniza reservas entre dispositivos.

function leerArray(clave) {
  try {
    const dato = leerLocal(clave,[]);
    return Array.isArray(dato) ? dato : [];
  } catch {
    return [];
  }
}

// Las reservas y ventas se recuperan de IndexedDB y se conservan entre sesiones del navegador.
let reservas = estadoInicial.reservas;
let ventas = estadoInicial.ventas;


let carrito = estadoInicial.carrito;
let eventos = leerArray("wg2_eventos").filter(e=>e&&typeof e.fecha==="string"&&typeof e.mensaje==="string").slice(0,100);

// La fecha de activación de ofertas se guarda una vez.
// Así no se reinicia al recargar la página.
const campana=activarCampana(leerLocal('wg_campana_promos',null));
const inicioPromos=campana.inicio;
escribirLocal('wg_campana_promos',campana);
escribirLocal('wg2_inicio_promos',inicioPromos);

// IndexedDB es ahora el almacenamiento principal; la función devuelve el resultado de la escritura.
function guardar() {
  pintarHistorial();
  return guardarEstado({reservas,ventas,carrito});
}

// =====================================================
// 6. ESTADO DE LA APLICACIÓN
// =====================================================

let unidadElegida = null;
let segundaUnidad = null;
let promoActiva = null;
let promoPorRecuperar = preferencias().recordarPromocion ? leerLocal("wg_promocion",null) : null;
let pendiente = null;
let timerModal = null;
let venceModal = 0;
let toastTimer = null;


let focoAnterior = null;

// =====================================================
// 7. FUNCIONES GENERALES
// =====================================================

const buscarEquipo = id => equipos.find(e => e.id === id);
const buscarProducto = id => productos.find(p => p.id === Number(id));
const moneda = n => "Bs " + Number(n).toFixed(2);

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;",
    '"':"&quot;", "'":"&#39;"
  })[c]);
}

function fechaLocal(fecha = new Date()) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function codigos(modelo) {
  return Array.from({length:modelo.cantidad}, (_,i) =>
    modelo.id.toUpperCase() + "-" + String(i+1).padStart(2,"0")
  );
}



// Precios calculados en centavos para evitar
// errores típicos de números decimales.


function stockDisponible(p) {
  const vendido = ventas
    .filter(v => v.id === p.id)
    .reduce((s,v) => s + v.cantidad, 0);
  return Math.max(0, p.stock - vendido);
}

function cantidadCarrito(id) {
  return carrito.find(x => x.id === id)?.cantidad || 0;
}

// =====================================================
// 8. HORARIOS Y SOLAPAMIENTOS
// =====================================================

function fechaReservaCorrecta(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [y,m,d] = texto.split("-").map(Number);
  const fecha = new Date(y,m-1,d);
  return fecha.getFullYear()===y && fecha.getMonth()===m-1 && fecha.getDate()===d && y===new Date().getFullYear() && texto>=fechaLocal();
}

function horaReservaCorrecta(fecha,hora) {
  if (!fechaReservaCorrecta(fecha) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return false;
  return new Date(fecha+"T"+hora)>new Date();
}

function intervaloActual() {
  const fecha = $("#fechaReserva").val();
  const hora = $("#horaReserva").val();
  const minutos = Number($("#duracionReserva").val());

  if (!horaReservaCorrecta(fecha,hora) || !Number.isInteger(minutos) ||
      minutos < 10 || minutos > 480 || minutos % 10 !== 0) return null;

  const inicio = new Date(`${fecha}T${hora}`);
  if (Number.isNaN(inicio.getTime())) return null;

  return {
    inicio,
    fin: new Date(inicio.getTime() + minutos * 60000),
    minutos
  };
}

function horarioValido(i) {
  return Boolean(
    i &&
    i.inicio > new Date() &&
    dentroHorario(i.inicio,i.fin) &&
    fechaLocal(i.inicio) ===
    fechaLocal(new Date(i.fin.getTime() - 1))
  );
}

// Una unidad está ocupada si hay una reserva
// que se superpone con el horario elegido.
function libre(codigo, intervalo) {
  if (!intervalo) return false;

  return !reservas.some(r =>
    (r.unidades || [r.unidad]).includes(codigo) &&
    intervalo.inicio < new Date(r.fin) &&
    intervalo.fin > new Date(r.inicio)
  );
}

// =====================================================
// 9. PROMOCIONES Y VENCIMIENTO
// =====================================================

function conteoUnidades(modelo, intervalo = null) {
  const ocupadas = codigos(modelo).filter(codigo => intervalo
    ? !libre(codigo,intervalo)
    : reservas.some(r=>(r.unidades||[r.unidad]).includes(codigo) && new Date(r.fin)>new Date())
  ).length;
  return {libres:modelo.cantidad-ocupadas,ocupadas};
}

function vencimientoPromo(p) {
  return inicioPromos + p.dias * 24 * 60 * 60 * 1000;
}

function promoVigente(p) {
  return Date.now() < vencimientoPromo(p);
}

function tiempoPromo(p) {
  const ms = Math.max(0, vencimientoPromo(p) - Date.now());
  if (ms === 0) return "FINALIZADA";

  const dias = Math.floor(ms / 86400000);
  const horas = Math.floor(ms % 86400000 / 3600000);
  const min = Math.floor(ms % 3600000 / 60000);
  const seg = Math.floor(ms % 60000 / 1000);
  const dos = n => String(n).padStart(2,"0");

  return `${dias} ${dias===1?"día":"días"} · ${dos(horas)} h ${dos(min)} min ${dos(seg)} s`;
}

// =====================================================
// 10. INICIAR JQUERY
// =====================================================

$(function () {

  // Asistente: conserva las elecciones al retroceder y muestra una sola tarea.
  let pasoActual = 1;
  let asistenteIniciado = false;
  let decisionSnack = false;
  let ultimaGuia = "";
  const panelesPaso = ["#pasoEquipo", "#pasoSnacks", "#formReserva", "#pasoResumen"];

  function iniciarAsistente(origen = null) {
    if (!asistenteIniciado) {
      $("#fechaReserva, #horaReserva").val("");
      if (!promoActiva) $("#duracionReserva").prepend('<option value="">Elige la duración</option>').val("");
      asistenteIniciado = true;
    }
    if (!origen && !promoActiva && !unidadElegida && !$("#categoriaReserva option[value='']").length) {
      $("#categoriaReserva").prepend('<option value="">Elige una categoría</option>').val("");
      $("#modeloReserva").html('<option value="">Primero elige una categoría</option>');
    }
    if (origen?.tipo === "promo") {
      if (!$("#categoriaReserva option[value='']").length) $("#categoriaReserva").prepend('<option value="">Elige una categoría</option>');
      $("#categoriaReserva").val("");
      $("#modeloReserva").html('<option value="">Primero elige una categoría</option>');
      unidadElegida=null;
    }
    decisionSnack = carrito.length > 0;
    if (!decisionSnack) $("input[name=quiereSnack]").prop("checked",false);
    let mensaje = "";
    if (origen?.tipo === "equipo") mensaje = "Seleccionaste " + origen.nombre + ". Ahora elige cuándo y cuánto tiempo quieres jugar.";
    else if (promoActiva) mensaje = "Elegiste " + promoActiva.nombre + ". " + promoActiva.descripcion + " La duración y la rebaja ya están aplicadas.";
    else if (carrito.length) mensaje = "Guardamos tus snacks. Primero elige equipo y horario; en el siguiente paso podrás revisar tu carrito.";
    $("#origenReserva").text(mensaje).prop("hidden",!mensaje);
    actualizarUnidades();
    mostrarPaso(1, false);
  }

  function guiaEquipo() {
    if (!$("#categoriaReserva").val()) return ["Selecciona la categoría que prefieres: PlayStation, Xbox, computadoras u otro servicio.","#categoriaReserva"];
    if (!buscarEquipo($("#modeloReserva").val())) return ["Selecciona el modelo de " + $("#categoriaReserva option:selected").text() + " que quieres reservar.","#modeloReserva"];
    if ($("#fechaReserva").prop("validity")?.badInput) return ["La fecha está incompleta o es incorrecta. Selecciona una fecha válida en el calendario.","#fechaReserva"];
    if (!$("#fechaReserva").val()) return ["¿Qué día vendrás? Selecciona la fecha de tu visita.","#fechaReserva"];
    if (!fechaReservaCorrecta($("#fechaReserva").val())) return ["Fecha incorrecta: elige desde hoy hasta el 31 de diciembre del año actual.","#fechaReserva"];
    if (!$("#horaReserva").val()) return ["¿A qué hora empezarás? Indica tu hora de llegada.","#horaReserva"];
    if (!horaReservaCorrecta($("#fechaReserva").val(),$("#horaReserva").val())) return ["La hora no es válida o ya pasó. Elige una hora futura para tu visita.","#horaReserva"];
    if (!$("#duracionReserva").val()) return ["¿Cuánto tiempo quieres jugar? Selecciona la duración de tu sesión.","#duracionReserva"];
    const duracion = Number($("#duracionReserva").val());
    if (!Number.isInteger(duracion) || duracion<10 || duracion>480 || duracion%10!==0) return ["Elige una duración de 10 minutos a 8 horas, en intervalos de 10 minutos.","#duracionReserva"];
    if ($("#fechaReserva").val()<fechaLocal()) return ["Elige desde hoy hasta el 31 de diciembre del año actual.","#fechaReserva"];
    const i = intervaloActual();
    if (!horarioValido(i)) return ["Elige una fecha/hora futura dentro del horario comercial: lunes a sábado 10:00–22:00; domingo 14:00–20:00.","#horaReserva"];
    if (!unidadElegida || !libre(unidadElegida,i)) return ["¡Bien! Ahora pulsa una unidad libre para asignarla a tu reserva.","#unidadesDisponibles .unidad.libre:first"];
    if (promoActiva?.dosEstaciones && (!segundaUnidad || segundaUnidad===unidadElegida || !libre(segundaUnidad,i))) return ["Tu oferta incluye dos equipos. Elige también una segunda unidad libre.","#segundasUnidades .unidad.libre:first"];
    if (!codigos(buscarEquipo($("#modeloReserva").val())).includes(unidadElegida)) return ["Selecciona una unidad del modelo elegido.","#unidadesDisponibles .unidad.libre:first"];
    if (promoActiva && (!promoVigente(promoActiva) || i.minutos!==promoActiva.minutos)) return ["La promoción cambió o venció. Elige otra oferta o retírala para continuar.","#quitarPromo"];
    return ["¡Equipo y horario listos! Pulsa «Continuar a snacks».",null];
  }

  function guiaActual() {
    if (pasoActual===1) return guiaEquipo();
    if (pasoActual===2) {
      if (!decisionSnack) return [promoActiva ? "Tu promoción ya incluye sus snacks. ¿Quieres agregar algo más? Elige Sí o No, gracias." : "¿Te gustaría acompañar tu juego con un snack? Elige Sí o No, gracias.","input[name=quiereSnack]:first"];
      if ($("input[name=quiereSnack]:checked").val()==="si" && !carrito.length) return ["Elige lo que te apetezca y pulsa «+ Agregar», o marca «No, gracias» para seguir sin extras.","#catalogoSnackReserva .btn-agregar:not(:disabled):first"];
      if (promoActiva && !promoVigente(promoActiva)) return ["Esta promoción ha finalizado. Retírala o elige otra oferta antes de continuar.","#quitarPromo"];
      if (!validarStock(itemsPedido())) return ["Algún producto supera el stock disponible. Reduce su cantidad o cambia el snack de la promoción.","#carritoReserva"];
      return [promoActiva ? "Revisa los snacks de la oferta y tus extras. Cuando estés listo, continúa a tus datos." : "¡Listo! Puedes ajustar las cantidades o continuar a tus datos.",null];
    }
    if (pasoActual===3) {
      validarDatos();
      if (!regexNombre.test($("#nombreCliente").val().trim()) || $("#nombreCliente").val().trim().length<2) return ["¿Cómo te llamas? Escribe tu nombre con al menos 2 letras, sin números.","#nombreCliente"];
      if (!regexNombre.test($("#apellidoCliente").val().trim()) || $("#apellidoCliente").val().trim().length<2) return ["Ahora escribe tu apellido, usando al menos 2 letras y sin números.","#apellidoCliente"];
      if ($("#correoCliente").val().trim().length>100 || !regexCorreo.test($("#correoCliente").val().trim())) return ["Escribe tu correo completo. Por ejemplo: juan@correo.com.","#correoCliente"];
      if (!/^[67]\d{7}$/.test($("#telefonoCliente").val().trim())) return ["Por último, escribe tu celular: 8 números que comiencen con 6 o 7.","#telefonoCliente"];
      return ["¡Gracias! Tus datos están completos. Continúa para revisar tu pedido.",null];
    }
    return reservaLista() ? ["Todo está listo. Revisa tu pedido y pulsa «Revisar y confirmar». Si necesitas corregir algo, vuelve atrás.",null] : ["Revisa la reserva: el horario, la disponibilidad, el stock o la promoción han cambiado. Vuelve atrás para corregirlos.",null];
  }

  function actualizarGuia() {
    if (!asistenteIniciado) return;
    const categoriaValida = equipos.some(e=>e.categoria===$("#categoriaReserva").val());
    const modeloValido = Boolean(buscarEquipo($("#modeloReserva").val()));
    const fechaValida = fechaReservaCorrecta($("#fechaReserva").val());
    const horaValida = horaReservaCorrecta($("#fechaReserva").val(),$("#horaReserva").val());
    $("#modeloReserva").prop("disabled",!categoriaValida);
    $("#fechaReserva").prop("disabled",!modeloValido);
    $("#horaReserva").prop("disabled",!modeloValido || !fechaValida);
    $("#duracionReserva").prop("disabled",Boolean(promoActiva) || !modeloValido || !horaValida);
    $("#fechaReserva").attr("aria-invalid",Boolean($("#fechaReserva").val())&&!fechaValida ? "true":"false");
    $("#horaReserva").attr("aria-invalid",Boolean($("#horaReserva").val())&&!horaValida ? "true":"false");
    const [mensaje,selector] = guiaActual();
    const incluidos = itemsIncluidos().map(x=>x.cantidad+" × "+(buscarProducto(x.id)?.nombre||"snack")).join(", ");
    $("#snacksIncluidosGuia").text(promoActiva ? "Tu promoción incluye: "+incluidos+". Estos productos se mantienen aunque elijas no agregar extras." : "").prop("hidden",!promoActiva);
    const errorFecha = (Boolean($("#fechaReserva").val()) && !fechaValida) || Boolean($("#fechaReserva").prop("validity")?.badInput);
    const errorHora = Boolean($("#horaReserva").val()) && !horaValida;
    const esError = (pasoActual===1 && (errorFecha || errorHora)) || /incorrect|supera|finaliz|cambió|venció|no es válid/i.test(mensaje);
    $("#guiaReserva").toggleClass("aviso-error",esError).toggleClass("aviso-exito",!selector && !esError).toggleClass("aviso-pendiente",Boolean(selector) && !esError);
    if (mensaje!==ultimaGuia) {
      $("#guiaReserva").text(mensaje);
      ultimaGuia = mensaje;
    }
    $(".campo-guiado").removeClass("campo-guiado");
    if (selector) $(selector).addClass("campo-guiado");
    const listo = pasoActual===1 ? !guiaEquipo()[1] : pasoActual===2 ? decisionSnack && (!promoActiva || promoVigente(promoActiva)) && validarStock(itemsPedido()) && ($("input[name=quiereSnack]:checked").val()!=="si" || carrito.length>0) : pasoActual===3 ? validarDatos() : false;
    $("#pasoSiguiente").prop("disabled",!listo);
  }

  function mostrarPaso(numero, animar = true) {
    pasoActual = numero;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const anterior = $(".tarjeta-paso:visible");
    const destino = $(panelesPaso[numero-1]);
    // stop() completa transiciones anteriores para que nunca se superpongan tarjetas.
    $(".tarjeta-paso").stop(true,true);
    const entrar = function () {
      $(".tarjeta-paso").hide().prop("hidden",true);
      destino.removeAttr("hidden").css("opacity",1).hide().fadeIn(animar && !reducir ? 220 : 0, function () {
        // Una animación no debe quitar el foco si el usuario ya empezó a escribir en este paso.
        if (animar && !destino[0].contains(document.activeElement)) enfocarCampoActual();
      });
    };
    if (animar && !reducir) anterior.fadeTo(130,.25,entrar); else entrar();
    $(".progreso-reserva li").each(function (i) {
      $(this).toggleClass("completado",i<numero-1).toggleClass("actual",i===numero-1);
      if (i===numero-1) $(this).attr("aria-current","step"); else $(this).removeAttr("aria-current");
    });
    $("#pasoAnterior").prop("hidden",numero===1);
    $("#pasoSiguiente").prop("hidden",numero===4).text(["Continuar a snacks →","Continuar a mis datos →","Ver mi pedido →"][numero-1]||"");
    $("#etiquetaPaso").text("Paso "+numero+" de 4");
    $("#resHorario").text($("#fechaReserva").val()+" · "+$("#horaReserva").val());
    $("#resCliente").text($("#nombreCliente").val()+" "+$("#apellidoCliente").val());
    $("#resContacto").text($("#correoCliente").val()+" · "+$("#telefonoCliente").val());
    actualizarGuia();
  }


  function enfocarCampoActual() {
    if (!asistenteIniciado || !$("#vista-reservar").is(":visible")) return;
    const selector = guiaActual()[1] || (pasoActual===4 ? "#btnConfirmar" : "#pasoSiguiente");
    const campo = $(selector).filter(":visible:not(:disabled)").first();
    if (!campo.length) return;
    campo[0].focus({preventScroll:true});
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) campo.addClass("campo-entrada").delay(450).queue(function(next){$(this).removeClass("campo-entrada");next();});
    const rect = campo[0].getBoundingClientRect();
    if (rect.top<80 || rect.bottom>window.innerHeight-70) campo[0].scrollIntoView({block:"nearest",behavior:$.fx.off?"auto":"smooth"});
  }

  // Los selectores avanzan al elegir; el texto espera Enter o cambio completo para no interrumpir nombres y correos.
  $(document).on("change", "#vista-reservar select, #vista-reservar input", function () {
    if (!asistenteIniciado) return;
    if(this.matches('input[type=text],input[type=email],input[type=tel],textarea'))return;
    const campo=this;
    setTimeout(function () {
      if (campo.type==="radio" || document.activeElement===campo || document.activeElement===document.body) {
        if (campo.type==="date" && (!campo.validity.valid || campo.value<fechaLocal())) return;
        if (campo.type==="time" && !campo.validity.valid) return;
        enfocarCampoActual();
      }
    },0);
  });
  $(document).on("keydown", "#vista-reservar input:not([type=radio])", function(e) {
    if (e.key!=="Enter") return;
    e.preventDefault();
    actualizarGuia();
    enfocarCampoActual();
  });
  $(document).on("click", "#unidadesDisponibles .unidad.libre, #segundasUnidades .unidad.libre", function () {
    setTimeout(enfocarCampoActual,0);
  });

  function avanzarPaso() {
    actualizarGuia();
    if (pasoActual<4 && !$("#pasoSiguiente").prop("disabled")) mostrarPaso(pasoActual+1);
  }
  $("#pasoSiguiente").on("click",avanzarPaso);
  $("#pasoAnterior").on("click",()=>mostrarPaso(Math.max(1,pasoActual-1)));
  $(document).on("input change", "#vista-reservar input, #vista-reservar select", function (e) {
    if (this.id==="categoriaReserva" && e.type==="change") {
      $("#modeloReserva").prepend('<option value="">Elige un modelo</option>').val("");
      actualizarUnidades();
    }
    if (this.name==="quiereSnack") decisionSnack = true;
    actualizarGuia();
  });
  $(document).on("click", "#vista-reservar .btn-agregar, #vista-reservar .cambiar-cantidad", function () {
    decisionSnack = true;
    actualizarGuia();
  });

  // ---------------------------------------------
  // BITÁCORA
  // ---------------------------------------------
  function registrar(mensaje) {
    eventos.unshift({
      fecha:new Date().toLocaleString("es-BO"),
      mensaje
    });
    eventos = eventos.slice(0,100);
    escribirLocal("wg2_eventos", eventos);
    pintarBitacora();
  }

  function pintarBitacora() {
    $("#bitacora").empty();
    if (!eventos.length) {
      $("#bitacora").text("Todavía no hay eventos.");
      return;
    }
    eventos.forEach(e => {
      $("<p>").text(`${e.fecha} — ${e.mensaje}`)
        .appendTo("#bitacora");
    });
  }

  $("#limpiarBitacora").on("click", async function () {
    if(!await confirmar("¿Limpiar la bitácora de este navegador?"))return;
    eventos = [];
    quitarLocal("wg2_eventos");
    pintarBitacora();
    toast("Bitácora limpiada.");
  });

  // fadeToggle alterna la visibilidad de los datos de la microempresa.
  $("#alternarContacto").on("click",function () {
    const boton=$(this);
    const reducir=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $("#datosEmpresa").stop(true,true).fadeToggle(reducir?0:220,function () {
      const abierto=$(this).is(":visible");
      boton.attr("aria-expanded",String(abierto));
      boton.text(abierto?"Ocultar contacto y horarios":"Ver contacto y horarios");
    });
    registrar("Alternar datos de contacto con fadeToggle");
  });

  // ---------------------------------------------
  // AVISOS: mensajes en el flujo que no cubren los controles
  // ---------------------------------------------
  // Todos los mensajes utilizan una ubicación que no tapa la edición.
  function toast(mensaje) { notificar(mensaje); }

  // ---------------------------------------------
  // NAVEGACIÓN POR VISTAS
  // ---------------------------------------------
  function irVista(nombre, origen = null) {
    if (!["inicio","jugar","snacks","reservar","promos","info","mas","historial","horarios","contactos","carrito"].includes(nombre)) return;
    const destino = $("#vista-" + nombre);
    document.body.dataset.pantalla = nombre;
    if (nombre === "historial") pintarHistorial();
    if (nombre === "carrito") document.querySelector("#vista-carrito").append(document.querySelector("#panelCarrito"));
    if (nombre === "snacks") document.querySelector(".snacks-layout").append(document.querySelector("#panelCarrito"));
    if (!destino.length) return;

    $(".vista").not(destino).stop(true,true)
      .hide().attr("hidden",true);

    if (nombre === "reservar" && carrito.length) {
      $("input[name=quiereSnack][value=si]").prop("checked",true);
      $("#snacksEnReserva").stop(true,true).removeAttr("hidden").show();
      actualizarResumen();
    }
    if (nombre === "jugar") actualizarContadoresEquipos();
    if (nombre === "reservar") iniciarAsistente(origen);
    destino.removeAttr("hidden").show(); if(nombre==="reservar") enfocarCampoActual();
    window.dispatchEvent(new Event("wg:vista"));

    $(".nav-link").removeClass("activo");
    $(`.nav-link[data-vista="${nombre}"]`).addClass("activo");

    if (window.innerWidth <= 850) {
      // La barra inferior permanece visible al cambiar de pantalla.
      $("#btnMenu").attr("aria-expanded","false");
    }

    window.scrollTo({top:0,behavior:$.fx.off?"auto":"smooth"});
    registrar("Vista abierta: " + nombre);
  }

  $(document).on("click","[data-vista]",function () {
    irVista($(this).data("vista"));
  });

  $("#btnMenu").on("click",function () {
    if (window.innerWidth > 850) return;
    const abierto = $(this).attr("aria-expanded") === "true";
    $("#menu").stop(true,true).slideToggle(200);
    $(this).attr("aria-expanded",String(!abierto));
  });

  let eraMovil = window.innerWidth <= 850;
  $(window).on("resize",function () {
    const movil = window.innerWidth <= 850;
    if (movil !== eraMovil) {
      $("#menu").removeAttr("style");
      $("#btnMenu").attr("aria-expanded","false");
      eraMovil = movil;
    }
  });

  function tema(categoria) {
    $("body").removeClass(
      "tema-playstation tema-xbox tema-pc tema-arcade tema-internet"
    ).addClass("tema-" + categoria);
  }

  // ---------------------------------------------
  // CARRUSEL JQUERY
  // ---------------------------------------------
  function cargarModelos(selector,categoria) {
    const select = $(selector).empty();

    equipos.filter(e => e.categoria===categoria).forEach(e => {
      select.append(
        $("<option>").val(e.id)
          .text(`${e.nombre} — ${moneda(e.precio)}/h`)
      );
    });
  }

  // ---------------------------------------------
  // CATÁLOGO DE EQUIPOS
  // ---------------------------------------------
  let modeloPC = null;
  let paginaEquipos = 0, paginaSnacks = 0, paginaPromos = 0;
  function paginar(selector, pagina, filtro, atributo, control) {
    const tarjetas = [...document.querySelectorAll(selector)];
    const elegidas = tarjetas.filter(t=>(!filtro || filtro==="todos" || t.dataset[atributo]===filtro) && (selector!=="#catalogoEquipos > *" || filtro!=="pc" || !modeloPC || t.dataset.equipo===modeloPC));
    const limite = selector==="#listaPromos > *" ? 1 : (window.innerHeight < 740 ? 2 : 4);
    const paginas = Math.max(1, Math.ceil(elegidas.length/limite));
    pagina = Math.max(0,Math.min(pagina,paginas-1));
    tarjetas.forEach(t=>{ t.style.display=""; t.hidden=true; });
    elegidas.slice(pagina*limite,(pagina+1)*limite).forEach(t=>t.hidden=false);
    const caja = document.getElementById(control);
    caja.replaceChildren();
    for (const [texto,delta] of [["← Anterior",-1],["Siguiente →",1]]) {
      const b=document.createElement("button"); b.className="btn secundario"; b.textContent=texto;
      b.disabled=delta<0 ? pagina===0 : pagina===paginas-1;
      b.addEventListener("click",()=>{ if(control==="pagEquipos") paginaEquipos=pagina+delta; if(control==="pagSnacks") paginaSnacks=pagina+delta; if(control==="pagPromos") paginaPromos=pagina+delta; actualizarPaginas(); });
      caja.append(b);
      if(delta<0) { const s=document.createElement("span"); s.textContent=`Página ${pagina+1} de ${paginas}`; caja.append(s); }
    }
  }
  function actualizarPaginas() {
    paginar("#catalogoEquipos > *",paginaEquipos,$("#filtrosEquipos .activo").data("categoria"),"categoria","pagEquipos");
    paginar("#catalogoSnacks > *",paginaSnacks,$("#filtrosSnacks .activo").data("tipo"),"tipo","pagSnacks");
    paginar("#listaPromos > *",paginaPromos,"todos","","pagPromos");
  }
  function pintarEquipos() {
    $("#catalogoEquipos").empty();

    equipos.forEach(e => {
      $("#catalogoEquipos").append(`
        <article class="tarjeta equipo-card"
                 data-categoria="${e.categoria}" data-equipo="${e.id}">
          <div class="tarjeta-imagen">
            <span class="badge">${e.categoria.toUpperCase()}</span>
            <img src="${e.imagen}" alt="${escapar(e.nombre)}"
                 width="320" height="200" loading="lazy">
          </div>
          <div class="tarjeta-cuerpo">
            <h3><i class="bi ${e.icono}"></i> ${escapar(e.nombre)}</h3>
            <div class="precio">${moneda(e.precio)}/h</div>
            <div class="disponibilidad-catalogo" aria-live="polite"><span class="cuenta-libres">Disponibles: <b id="libres-${e.id}">${conteoUnidades(e).libres}</b></span><span class="cuenta-ocupadas">Ocupadas: <b id="ocupadas-${e.id}">${conteoUnidades(e).ocupadas}</b></span></div>
            <button class="btn secundario ancho btn-detalles"
                    aria-expanded="false">Ver detalles</button>
            <div class="detalles">${escapar(e.detalle)}</div>
            <button class="btn primario ancho btn-alquilar"
                    data-modelo="${e.id}">Alquilar hora</button>
          </div>
        </article>
      `);
    });
  }

  // Acordeón con slideToggle().
  $("#catalogoEquipos").on("click",".btn-detalles",function () {
    const abierto = $(this).attr("aria-expanded")==="true";
    $(this).next(".detalles").stop(true,true).slideToggle(200);
    $(this).attr("aria-expanded",String(!abierto))
      .text(abierto?"Ver detalles":"Ocultar detalles");
    registrar("Acordeón de equipo");
  });

  // Filtros con fadeIn/fadeOut().
  $("#filtrosEquipos").on("click",".filtro",debounce(async function () {
    const categoria = $(this).data("categoria");
    if(categoria==="pc") {
      const eleccion=await mostrarDialogo("Computadoras","Selecciona el tipo de equipo",[{texto:"Todas",valor:"todas"},{texto:"PC Gamer",valor:"pcg"},{texto:"PC Normal",valor:"pcn"}]);
      if(eleccion===false)return;modeloPC=eleccion==="todas"?null:eleccion;
    } else modeloPC=null;
    $("#filtrosEquipos .filtro").removeClass("activo");
    $(this).addClass("activo");

    $(".equipo-card").each(function () {
      const mostrar = categoria==="todos" ||
        $(this).data("categoria")===categoria;

      $(this).stop(true,true)[mostrar?"fadeIn":"fadeOut"](200);
    });

    if (categoria!=="todos") tema(categoria);
    paginaEquipos=0; setTimeout(actualizarPaginas,230);
    registrar("Filtro: " + categoria);
  },100));

  // Alquilar desde una tarjeta.
  $("#catalogoEquipos").on("click",".btn-alquilar",function () {
    quitarPromocion(false);
    const e = buscarEquipo($(this).data("modelo"));
    if (!e) return;

    $("#categoriaReserva").val(e.categoria);
    cargarModelos("#modeloReserva",e.categoria);
    $("#modeloReserva").val(e.id);
    unidadElegida = null;

    tema(e.categoria);
    irVista("reservar", {tipo:"equipo", nombre:e.nombre});
    actualizarUnidades();
    toast("Seleccionaste " + e.nombre);
  });

  // ---------------------------------------------
  // SNACKS DESTACADOS: SOLO VISUALES
  // ---------------------------------------------
  function pintarSnacks() {
    $("#catalogoSnacks, #catalogoSnackReserva").empty();

    productos.forEach(p => {
      const stock = stockDisponible(p);
      const boton = `
        <button class="btn primario btn-agregar"
                data-id="${p.id}"
                ${stock===0?"disabled":""}>+ Agregar</button>
      `;

      $("#catalogoSnacks").append(`
        <article class="tarjeta snack-card" data-tipo="${p.tipo}">
          <div class="tarjeta-imagen">
            <span class="badge">${p.tipo}</span>
            <img src="${p.imagen}" alt="${escapar(p.nombre)}"
                 loading="lazy" width="320" height="200">
          </div>
          <div class="tarjeta-cuerpo">
            <h3>${escapar(p.nombre)}</h3>
            <div class="precio">${moneda(p.precio)}</div>
            <p class="stock">Stock: ${stock}</p>
            ${boton}
          </div>
        </article>
      `);

      $("#catalogoSnackReserva").append(`
        <div class="snack-fila">
          <div>
            <strong>${escapar(p.nombre)}</strong>
            <small>${moneda(p.precio)} · Stock: ${stock}</small>
          </div>
          ${boton}
        </div>
      `);
    });
  }

  $("#filtrosSnacks").on("click",".filtro",debounce(async function () {
    const tipo = $(this).data("tipo");
    $("#filtrosSnacks .filtro").removeClass("activo");
    $(this).addClass("activo");

    $(".snack-card").each(function () {
      const mostrar = tipo==="todos" || $(this).data("tipo")===tipo;
      $(this).stop(true,true)[mostrar?"fadeIn":"fadeOut"](200);
    });

    paginaSnacks=0; setTimeout(actualizarPaginas,230);
    registrar("Filtro snacks: " + tipo);
  },100));

  function snacksAdicionales() {
    return $("input[name=quiereSnack]:checked").val()==="si"
      ? carrito.map(x=>({...x})) : [];
  }

  function itemsIncluidos() {
    return promoActiva ? [{id:4,cantidad:promoActiva.gaseosas}] : [];
  }

  // Suma las cantidades de un mismo producto.
  function combinarItems(items) {
    const mapa = new Map();
    items.forEach(x =>
      mapa.set(x.id,(mapa.get(x.id)||0)+x.cantidad)
    );
    return [...mapa].map(([id,cantidad])=>({id,cantidad}));
  }

  function itemsPedido() {
    return combinarItems([
      ...snacksAdicionales(),
      ...itemsIncluidos()
    ]);
  }

  function validarStock(items) {
    return items.every(x => {
      const p = buscarProducto(x.id);
      return p && Number.isInteger(x.cantidad) && x.cantidad>0 &&
        x.cantidad<=stockDisponible(p);
    });
  }

  function pintarCarrito() {
    $("#listaCarrito, #carritoReserva").empty();

    if (!carrito.length) {
      $("#listaCarrito, #carritoReserva").text("Sin productos.");
    }

    carrito.forEach(x => {
      const p = buscarProducto(x.id);
      if (!p) return;

      const html = `
        <div class="item-carrito">
          <div><strong>${escapar(p.nombre)}</strong>
            <small>${moneda(p.precio)}</small></div>
          <div class="controles-cantidad">
            <button class="cambiar-cantidad" data-id="${p.id}"
                    data-cambio="-1" aria-label="Restar">−</button>
            <strong>${x.cantidad}</strong>
            <button class="cambiar-cantidad" data-id="${p.id}"
                    data-cambio="1" aria-label="Sumar">+</button>
          </div>
        </div>
      `;
      $("#listaCarrito, #carritoReserva").append(html);
    });

    const total = carrito.reduce((s,x) => {
      const p = buscarProducto(x.id);
      return s + (p ? p.precio*100*x.cantidad : 0);
    },0);

    $("#totalCarrito").text(moneda(total/100));
    guardar();
    window.dispatchEvent(new Event("wg:carrito"));
    actualizarResumen();
  }

  $(document).on("click",".btn-agregar",function () {
    const id = Number($(this).data("id"));
    const p = buscarProducto(id);
    if (!p) return;

    if (cantidadCarrito(id)+(itemsIncluidos().find(x=>x.id===id)?.cantidad||0)>=stockDisponible(p)) {
      toast("Stock insuficiente.");
      return;
    }

    const item = carrito.find(x=>x.id===id);
    if (item) item.cantidad++;
    else carrito.push({id,cantidad:1});

    pintarCarrito();
    $("input[name=quiereSnack][value=si]").prop("checked",true);
    $("#snacksEnReserva").stop(true,true).removeAttr("hidden").show();
    actualizarResumen();
    registrar("Snack agregado: " + p.nombre);
    toast(p.nombre + " agregado.");
  });

  $(document).on("click",".cambiar-cantidad",function () {
    const id = Number($(this).data("id"));
    const cambio = Number($(this).data("cambio"));
    const item = carrito.find(x=>x.id===id);
    const p = buscarProducto(id);
    if (!item || !p) return;

    if (cambio>0 && item.cantidad+(itemsIncluidos().find(x=>x.id===id)?.cantidad||0)>=stockDisponible(p)) {
      toast("No hay más stock.");
      return;
    }

    item.cantidad += cambio;
    if (item.cantidad<=0) carrito=carrito.filter(x=>x.id!==id);
    registrar("Cantidad modificada: "+p.nombre+" / "+(item.cantidad>0?item.cantidad:"eliminado"));
    pintarCarrito();
  });

  $("#vaciarCarrito").on("click",async function () {
    if(!await confirmar("¿Vaciar todos los productos del carrito?"))return;
    carrito=[];
    pintarCarrito();
    toast("Carrito vaciado.");
    registrar("Carrito vaciado");
  });

  // Mostrar u ocultar snacks dentro de la reserva.
  $("input[name=quiereSnack]").on("change",function () {
    const si = $(this).val()==="si";
    if (si) {
      $("#snacksEnReserva").removeAttr("hidden")
        .hide().slideDown(200);
    } else {
      $("#snacksEnReserva").slideUp(200,function () {
        $(this).attr("hidden",true);
      });
    }
    actualizarResumen();
    registrar("Snacks opcionales: " + (si?"Sí":"No"));
  });

  // ---------------------------------------------
  // SELECCIÓN DE EQUIPOS Y HORARIOS
  // ---------------------------------------------
  function construirDuraciones() {
    $("#duracionReserva").empty();

    // Desde 10 hasta 480 minutos, de 10 en 10.
    for (let min=10;min<=480;min+=10) {
      $("#duracionReserva").append(
        $("<option>").val(min).text(textoDuracion(min))
      );
    }
    $("#duracionReserva").val("60");
  }

  function pintarBotonesUnidades(selector,modelo,seleccion,segunda=false) {
    const contenedor = $(selector).empty();
    const i = intervaloActual();

    if (!modelo || !horarioValido(i)) return;

    codigos(modelo).forEach(codigo => {
      // No se permite elegir la misma unidad dos veces.
      const disponible = libre(codigo,i) &&
        (!segunda || codigo!==unidadElegida);

      const marcado = codigo===seleccion;

      contenedor.append(`
        <button class="unidad ${disponible?"libre":"ocupada"}
                ${marcado?"seleccionada":""}"
                data-unidad="${codigo}"
                ${disponible?"":"disabled"}
                aria-pressed="${marcado}">
          <i class="bi bi-controller"></i> ${codigo}
          <span>${disponible?"Libre":"Ocupada"}</span>
        </button>
      `);
    });
  }

  function actualizarContadoresEquipos() {
    const intervalo = intervaloActual();
    const valido = horarioValido(intervalo);
    equipos.forEach(e=>{
      const c=conteoUnidades(e,valido?intervalo:null);
      $("#libres-"+e.id).text(c.libres);
      $("#ocupadas-"+e.id).text(c.ocupadas);
    });
    $("#contextoDisponibilidad").text(valido
      ? "Disponibilidad para el horario elegido en Reservar."
      : "La disponibilidad se calcula para el horario elegido.");
  }

  function actualizarUnidades() {
    actualizarContadoresEquipos();
    const modelo = buscarEquipo($("#modeloReserva").val());
    const i = intervaloActual();

    if (!modelo || !horarioValido(i)) {
      unidadElegida=null;
      segundaUnidad=null;
      $("#unidadesDisponibles, #segundasUnidades").empty();
      $("#conteoDisponibles").text("—");
      $("#mensajeDisponibilidad").text(
        "La sesión debe estar dentro del horario comercial y terminar el mismo día."
      );
      actualizarResumen();
      return;
    }

    const disponibles = codigos(modelo).filter(c=>libre(c,i));

    if (!disponibles.includes(unidadElegida)) unidadElegida=null;

    pintarBotonesUnidades(
      "#unidadesDisponibles",modelo,unidadElegida
    );

    $("#conteoDisponibles").text(
      `${disponibles.length} de ${modelo.cantidad} libres`
    );

    $("#mensajeDisponibilidad").text(
      disponibles.length
        ? "6. Pulsa un equipo marcado como libre para seleccionarlo."
        : "No hay unidades libres en ese horario."
    );

    actualizarSegundaUnidad();
    actualizarResumen();
  }

  function actualizarSegundaUnidad() {
    if (!promoActiva || !promoActiva.dosEstaciones) return;

    const modelo = buscarEquipo($("#modeloSegundo").val());
    const i = intervaloActual();

    if (!modelo || !horarioValido(i)) {
      segundaUnidad=null;
      $("#segundasUnidades").empty();
      return;
    }

    if (segundaUnidad===unidadElegida ||
        !codigos(modelo).includes(segundaUnidad) ||
        !libre(segundaUnidad,i)) {
      segundaUnidad=null;
    }

    pintarBotonesUnidades(
      "#segundasUnidades",modelo,segundaUnidad,true
    );

    $("#ayudaSegundaUnidad").text(
      segundaUnidad
        ? "Segunda unidad: " + segundaUnidad
        : "Selecciona otra unidad libre."
    );
  }

  $("#unidadesDisponibles").on("click",".unidad.libre",function () {
    unidadElegida=$(this).data("unidad");
    actualizarUnidades();
    registrar("Unidad elegida: " + unidadElegida);
  });

  $("#segundasUnidades").on("click",".unidad.libre",function () {
    segundaUnidad=$(this).data("unidad");
    actualizarSegundaUnidad();
    actualizarResumen();
    registrar("Segunda unidad: " + segundaUnidad);
  });

  $("#categoriaReserva").on("change",function () {
    cargarModelos("#modeloReserva",$(this).val());
    unidadElegida=null;
    tema($(this).val());
    actualizarUnidades();
  });

  $("#modeloReserva").on("change",function () {
    unidadElegida=null;
    actualizarUnidades();
  });

  $("#modeloSegundo").on("change",function () {
    segundaUnidad=null;
    actualizarSegundaUnidad();
    actualizarResumen();
  });

  $("#fechaReserva, #horaReserva, #duracionReserva")
    .on("input change",function () {
      actualizarUnidades();
    });

  $("#rapidaCategoria").on("change",function () {
    cargarModelos("#rapidaModelo",$(this).val());
  });

  $("#irReserva").on("click",function () {
    quitarPromocion(false);
    const e=buscarEquipo($("#rapidaModelo").val());
    if (!e) return;

    $("#categoriaReserva").val(e.categoria);
    cargarModelos("#modeloReserva",e.categoria);
    $("#modeloReserva").val(e.id);
    unidadElegida=null;
    tema(e.categoria);
    irVista("reservar", {tipo:"equipo", nombre:e.nombre});
    actualizarUnidades();
  });

  // ---------------------------------------------
  // PROMOCIONES: ACTIVACIÓN SOLO POR CLIC
  // ---------------------------------------------
  function pintarPromociones() {
    $("#listaPromos").empty();

    promociones.forEach(p => {
      $("#listaPromos").append(`
        <article class="tarjeta promo-card">
          <div class="tarjeta-imagen promo-visual">
            <img src="${p.imagen}" alt="${escapar(p.descripcion)}" loading="lazy" width="640" height="420">
            <div class="temporizador-imagen"><span>La oferta termina en</span><strong id="relojPromo${p.id}" class="promo-reloj"></strong></div>
          </div>
          <div class="tarjeta-cuerpo">
            <button class="btn primario btn-usar-promo" data-id="${p.id}">Elegir esta promoción</button>
          </div>
        </article>
      `);
    });
  }

  function actualizarRelojes() {
    promociones.forEach(p => {
      $("#relojPromo"+p.id).text(tiempoPromo(p));
      $(`.btn-usar-promo[data-id="${p.id}"]`)
        .prop("disabled",!promoVigente(p))
        .text(promoVigente(p)
          ?"Elegir esta promoción":"Promoción finalizada");
    });

    const primera = promociones.find(p=>p.id===1 && promoVigente(p));
    $("#promoInicioNombre").text(
      primera ? primera.nombre : "Ofertas finalizadas"
    );
    $("#promoInicioEstado").text(primera ? "Ahorra Bs 5 en tu paquete" : "Esta oferta ha finalizado");
    $("#contadorInicio").text(
      primera ? tiempoPromo(primera) : "FINALIZADAS"
    );

    // Si una oferta vence mientras se está
    // preparando la reserva, se desactiva.
    if (promoActiva && !promoVigente(promoActiva)) {
      quitarPromocion(false);
      toast("La promoción ha finalizado.");
    }
  }

  function configurarOpcionesPromo() {
    $("#opcionesPromo, #grupoSnackPromo, #grupoSaborPromo, #bloqueSegundaUnidad").prop("hidden",true);
    if (promoActiva) $("#opcionesPromo, #grupoSaborPromo").removeAttr("hidden");
  }

  function aplicarPromocion(p) {
    if (!promoVigente(p)) {
      toast("Esta promoción ya finalizó.");
      return;
    }

    promoActiva=p;
    if(preferencias().recordarPromocion)escribirLocal("wg_promocion",p.id);
    unidadElegida=null;
    segundaUnidad=null;

    // La duración de la oferta queda fijada.
    $("#duracionReserva").val(String(p.minutos))
      .prop("disabled",true);

    $("#bannerPromoActiva").removeAttr("hidden");
    $("#nombrePromoActiva").text(
      p.nombre + " · Descuento de " + moneda(p.descuento)
    );
    $("#descripcionPromoActiva").text(p.descripcion+" La duración está fijada. Elige equipo, fecha y hora; luego selecciona una unidad libre. Los snacks del paquete se agregan automáticamente.");

    configurarOpcionesPromo();
    irVista("reservar", {tipo:"promo", nombre:p.nombre});
    actualizarUnidades();

    registrar("Promoción seleccionada: "+p.nombre);
    toast("Promoción activada. Completa tu reserva.");
  }

  function quitarPromocion(avisar=true) {
    promoActiva=null;
    quitarLocal("wg_promocion");
    segundaUnidad=null;

    $("#duracionReserva").prop("disabled",false);
    $("#bannerPromoActiva, #opcionesPromo, #bloqueSegundaUnidad")
      .attr("hidden",true);

    $("#duracionReserva").val("60");
    actualizarUnidades();

    if (avisar) {
      toast("Promoción retirada.");
      registrar("Promoción retirada");
    }
  }

  $("#listaPromos").on("click",".btn-usar-promo",function () {
    const p=promociones.find(x=>x.id===Number($(this).data("id")));
    if (p) aplicarPromocion(p);
  });

  $("#quitarPromo").on("click",function () {
    quitarPromocion();
  });

  $("#snackPromo, #saborPromo").on("change",function () {
    actualizarResumen();
  });

  // ---------------------------------------------
  // CALCULADORA EN TIEMPO REAL
  // ---------------------------------------------
  function calcularPedido() {
    const modelo=buscarEquipo($("#modeloReserva").val());
    const segundo=buscarEquipo($("#modeloSegundo").val());
    const i=intervaloActual();
    const minutos=i?.minutos||0;

    let juego=modelo ? costoMinutos(modelo.precio,minutos) : 0;

    if (promoActiva?.dosEstaciones && segundo) {
      juego+=costoMinutos(segundo.precio,minutos);
    }

    const items=itemsPedido();
    const snacks=items.reduce((s,x)=>{
      const p=buscarProducto(x.id);
      return s+(p?p.precio*100*x.cantidad:0);
    },0);

    const descuento=promoActiva && promoVigente(promoActiva)
      ?promoActiva.descuento*100:0;

    return {
      juego,snacks,descuento,
      total:totalPedido(juego,snacks,descuento),
      items
    };
  }

  function pintarDetalleSnacks(selector, items, incluidos = []) {
    const lista = $(selector).empty();
    if (!items.length) lista.append($("<p>").addClass("ayuda").text("Sin snacks seleccionados."));
    items.forEach(x => {
      const p = buscarProducto(x.id);
      if (!p) return;
      const cantidadPromo = incluidos.find(y=>y.id===x.id)?.cantidad || 0;
      const fila = $("<div>").addClass("detalle-snack");
      const nombre = $("<div>").append($("<strong>").text(x.cantidad+" × "+p.nombre));
      nombre.append($("<small>").text(moneda(p.precio)+" c/u"));
      if (cantidadPromo) nombre.append($("<small>").addClass("origen-promo").text(
        cantidadPromo+" del paquete"+(x.cantidad>cantidadPromo ? " · "+(x.cantidad-cantidadPromo)+" extra(s)" : "")
      ));
      fila.append(nombre, $("<strong>").text(moneda(p.precio*x.cantidad)));
      lista.append(fila);
    });
  }

  function actualizarResumen() {
    const modelo=buscarEquipo($("#modeloReserva").val());
    const segundo=buscarEquipo($("#modeloSegundo").val());
    const i=intervaloActual();
    const c=calcularPedido();

    $("#resModelo").text(
      modelo ? modelo.nombre +
        (promoActiva?.dosEstaciones && segundo
          ?" + "+segundo.nombre:"") : "—"
    );

    $("#resUnidad").text(
      (unidadElegida||"—") +
      (promoActiva?.dosEstaciones
        ?" / "+(segundaUnidad||"—"):"")
    );

    $("#resDuracion").text(
      i?textoDuracion(i.minutos):"—"
    );

    $("#resJuego").text(moneda(c.juego/100));
    $("#resSnacks").text(moneda(c.snacks/100));
    $("#filaSnacksResumen, #resListaSnacks").prop("hidden",c.items.length===0);
    pintarDetalleSnacks("#resListaSnacks", c.items, itemsIncluidos());
    $("#resNormal").text(moneda((c.juego+c.snacks)/100));
    $("#filaNormal").prop("hidden",!promoActiva);
    $("#resTotal").text(moneda(c.total/100));

    const conPromo=Boolean(promoActiva);
    $("#filaDescuento").prop("hidden",!conPromo);
    $("#resDescuento").text("− "+moneda(c.descuento/100));

    $("#resDetallePromo").prop("hidden",!conPromo).text(
      conPromo
        ? "Oferta aplicada: "+promoActiva.nombre+
          ". El paquete suma juego y snacks y descuenta Bs 5. Los extras se cobran a precio normal."
        : "Tarifa normal. Sin descuento."
    );

    actualizarBoton();
    actualizarGuia();
    return c;
  }

  // ---------------------------------------------
  // FORMULARIO PROGRESIVO
  // ---------------------------------------------


  function validarDatos() {
    const nombre=$("#nombreCliente").val().trim();
    const apellido=$("#apellidoCliente").val().trim();
    const correo=$("#correoCliente").val().trim();
    const telefono=$("#telefonoCliente").val().trim();

    const identidad=validarIdentidad({nombre,apellido,email:correo,telefono});
    const {nombre:n,apellido:a,correo:c,telefono:t}=identidad;

    $("#apellidoCliente").prop("disabled",!n);
    $("#correoCliente").prop("disabled",!(n&&a));
    $("#telefonoCliente").prop("disabled",!(n&&a&&c));

    $("#ayudaNombre").text(
      n?"✓ Nombre correcto.":"Escribe al menos 2 letras, sin números. Ej.: Juan."
    ).toggleClass("correcto",n);

    $("#ayudaApellido").text(
      !n?"Completa primero tu nombre.":
      a?"✓ Apellido correcto.":"Escribe al menos 2 letras, sin números. Ej.: Pérez."
    ).toggleClass("correcto",n&&a);

    $("#ayudaCorreo").text(
      !(n&&a)?"Completa primero tu apellido.":
      c?"✓ Correo correcto.":"Usa el formato nombre@correo.com."
    ).toggleClass("correcto",n&&a&&c);

    $("#ayudaTelefono").text(
      !(n&&a&&c)?"Completa primero tu correo.":
      t?"✓ Datos completos.":"Celular de 8 dígitos, comienza con 6 o 7."
    ).toggleClass("correcto",n&&a&&c&&t);

    return n&&a&&c&&t;
  }

  function reservaLista() {
    const i=intervaloActual();
    const modelo=buscarEquipo($("#modeloReserva").val());

    if (!validarDatos() || !horarioValido(i) ||
        !modelo || !unidadElegida ||
        !codigos(modelo).includes(unidadElegida) ||
        !libre(unidadElegida,i)) return false;

    if (promoActiva) {
      if (!promoVigente(promoActiva) ||
          i.minutos!==promoActiva.minutos) return false;

      if (promoActiva.dosEstaciones) {
        const segundo=buscarEquipo($("#modeloSegundo").val());

        if (!segundo || !segundaUnidad ||
            segundaUnidad===unidadElegida ||
            !codigos(segundo).includes(segundaUnidad) ||
            !libre(segundaUnidad,i)) return false;
      }
    }

    return validarStock(itemsPedido());
  }

  function actualizarBoton() {
    $("#btnConfirmar").prop("disabled",!reservaLista());
    actualizarGuia();
  }

  $("#nombreCliente, #apellidoCliente, #correoCliente, #telefonoCliente")
    .on("input blur",function () {
      validarDatos();
      actualizarBoton();
    });

  $("#nombreCliente").on("focus",()=>$("#ayudaNombre").text("Escribe tu nombre: mínimo 2 letras, sin números."));
  $("#apellidoCliente").on("focus",()=>$("#ayudaApellido").text("Escribe tu apellido: mínimo 2 letras, sin números."));
  $("#correoCliente").on("focus",()=>$("#ayudaCorreo").text("Escribe tu correo completo. Ej.: juan@correo.com."));
  $("#telefonoCliente").on("focus",()=>$("#ayudaTelefono").text("Escribe 8 números; el primero debe ser 6 o 7. Ej.: 71234567."));

  // ---------------------------------------------
  // FORMULARIO: preventDefault()
  // ---------------------------------------------
  $("#formReserva").on("submit",function(e) {
    e.preventDefault();
    $("#errorFormulario").text("");

    if (pasoActual !== 4) { avanzarPaso(); return; }
    if (!reservaLista()) {
      $("#errorFormulario").text(
        "Revisa tus datos, unidades, horario y stock."
      );
      toast("Revisa los datos de tu reserva.");
      return;
    }

    const i=intervaloActual();
    const c=calcularPedido();

    pendiente={
      id:"WG-"+Date.now().toString(36).toUpperCase(),
      nombre:$("#nombreCliente").val().trim(),
      apellido:$("#apellidoCliente").val().trim(),
      correo:$("#correoCliente").val().trim(),
      telefono:$("#telefonoCliente").val().trim(),
      unidades:promoActiva?.dosEstaciones
        ?[unidadElegida,segundaUnidad]
        :[unidadElegida],
      modelo:$("#modeloReserva").val(),
      inicio:i.inicio.toISOString(),
      fin:i.fin.toISOString(),
      minutos:i.minutos,
      items:c.items.map(x=>({...x})),
      promoId:promoActiva?.id||null,
      sabor:promoActiva?$("#saborPromo").val():null,
      incluidos:itemsIncluidos().map(x=>({...x})),
      juegoCentavos:c.juego,
      snacksCentavos:c.snacks,
      descuentoCentavos:c.descuento,
      totalCentavos:c.total
    };

    abrirModal();
    registrar("Formulario de reserva validado");
  });

  // ---------------------------------------------
  // MODAL DE 30 SEGUNDOS
  // ---------------------------------------------
  function abrirModal() {
    if (!pendiente) return;

    focoAnterior=document.activeElement;
    document.querySelector("main").inert=true;document.querySelector("header").inert=true;
    $("#detalleModal").empty();

    [
      "Cliente: "+pendiente.nombre+" "+pendiente.apellido,
      "Equipo(s): "+pendiente.unidades.join(", "),
      "Duración: "+textoDuracion(pendiente.minutos),
      ...(pendiente.promoId ? ["Promoción: "+promociones.find(p=>p.id===pendiente.promoId).nombre] : []),
      "Precio: "+moneda(pendiente.juegoCentavos/100),
      ...(pendiente.items.length ? ["Snacks: "+moneda(pendiente.snacksCentavos/100)] : []),
      ...(pendiente.descuentoCentavos ? ["Descuento: − "+moneda(pendiente.descuentoCentavos/100)] : []),
      "Total: "+moneda(pendiente.totalCentavos/100)
    ].forEach(t=>$("<p>").text(t).appendTo("#detalleModal"));

    if (pendiente.items.length) $("<h3>").text("Snacks de tu pedido").appendTo("#detalleModal");
    $("<div>").attr("id","snacksModal").appendTo("#detalleModal");
    if (pendiente.items.length) pintarDetalleSnacks("#snacksModal", pendiente.items, pendiente.incluidos);
    $("#contadorModal").text("00:30");
    $("#modalReserva").attr("aria-hidden","false").fadeIn(200);
    $("#aceptarModal").trigger("focus");

    clearInterval(timerModal);
    venceModal=Date.now()+30000;

    timerModal=setInterval(function () {
      const restante=Math.max(
        0,Math.ceil((venceModal-Date.now())/1000)
      );
      $("#contadorModal").text(
        "00:"+String(restante).padStart(2,"0")
      );

      if (restante<=0) {
        cerrarModal();
        toast("Tarifa Flash Expirada");
        registrar("Modal de reserva expirado");
      }
    },200);
  }

  function cerrarModal() {
    clearInterval(timerModal);
    timerModal=null;
    pendiente=null;
    $("#modalReserva").attr("aria-hidden","true").fadeOut(200);

    document.querySelector("main").inert=false;document.querySelector("header").inert=false;
    if (focoAnterior?.focus) focoAnterior.focus();
  }

  $("#cerrarModal, #cancelarModal").on("click",function () {
    cerrarModal();
    registrar("Confirmación cancelada");
  });

  $(document).on("keydown",function(e) {
    if (e.key==="Escape" && $("#modalReserva").is(":visible"))
      cerrarModal();
  });

  $("#modalReserva").on("keydown",function(e) {
    if (e.key!=="Tab") return;

    const botones=$(this).find("button:visible:not(:disabled)");
    const primero=botones[0];
    const ultimo=botones[botones.length-1];

    if (e.shiftKey && document.activeElement===primero) {
      e.preventDefault(); ultimo.focus();
    } else if (!e.shiftKey && document.activeElement===ultimo) {
      e.preventDefault(); primero.focus();
    }
  });

  // ---------------------------------------------
  // CONFIRMACIÓN FINAL
  // ---------------------------------------------
  $("#aceptarModal").on("click",async function () {
    if($(this).prop("disabled"))return;
    if (!pendiente || Date.now()>=venceModal) {
      cerrarModal();
      toast("Tarifa Flash Expirada");
      return;
    }

    const r=pendiente;
    const i={
      inicio:new Date(r.inicio),
      fin:new Date(r.fin)
    };

    // Verificar nuevamente disponibilidad y stock.
    const disponibles=r.unidades.every(c=>libre(c,i));
    const promoCorrecta=!r.promoId ||
      promoVigente(promociones.find(p=>p.id===r.promoId));

    if (!disponibles || !validarStock(r.items) || !promoCorrecta || !horarioValido(i)) {
      cerrarModal();
      actualizarUnidades();
      toast("La disponibilidad, el stock o la oferta ha cambiado.");
      return;
    }

    const antes={reservas:reservas.slice(),ventas:ventas.slice(),carrito:carrito.slice()};
    $("#aceptarModal").prop("disabled",true);
    reservas.push({...r});

    r.items.forEach(x=>{
      ventas.push({id:x.id,cantidad:x.cantidad});
    });

    carrito=[];
    const guardado=await guardar();
    $("#aceptarModal").prop("disabled",false);
    if(!guardado){reservas=antes.reservas;ventas=antes.ventas;carrito=antes.carrito;pintarHistorial();toast("No se pudo guardar. Libera espacio en el navegador e inténtalo de nuevo.");return;}
    cerrarModal();

    // Limpiar el formulario después de confirmar.
    $("#formReserva")[0].reset();
    $("#nombreCliente, #apellidoCliente, #correoCliente, #telefonoCliente")
      .val("");
    $("#apellidoCliente, #correoCliente, #telefonoCliente")
      .prop("disabled",true);

    quitarPromocion(false);
    unidadElegida=null;
    segundaUnidad=null;

    $("input[name=quiereSnack][value=no]").prop("checked",true);
    $("#snacksEnReserva").attr("hidden",true).hide();

    pintarSnacks();
    actualizarPaginas();
    pintarCarrito();
    actualizarUnidades();
    validarDatos();

    asistenteIniciado=false;
    iniciarAsistente();
    registrar("Reserva confirmada: "+r.id+
      " / "+r.unidades.join(", "));

    toast("¡Reserva confirmada! Código: "+r.id);
  });

  // ---------------------------------------------
  // INICIALIZACIÓN GENERAL
  // ---------------------------------------------


  $("#fechaReserva")
    .attr("min",fechaLocal())
    .attr("max",new Date().getFullYear()+"-12-31")
    .val(fechaLocal());

  construirDuraciones();

  cargarModelos("#rapidaModelo","playstation");
  cargarModelos("#modeloReserva","playstation");




  pintarEquipos();

  pintarSnacks();
  pintarCarrito();
  pintarPromociones();
  pintarBitacora();
  actualizarUnidades();
  actualizarRelojes();
  validarDatos();

  // Contadores actualizados cada segundo.
  relojVisible(()=>{actualizarRelojes();actualizarHorario();},1000);

  // Actualización al regresar a la pestaña.
  $(window).on("focus",function () {
    actualizarRelojes();
    actualizarUnidades();
  });

  actualizarPaginas();
  iniciarPWA();
  const aplicarPreferencias=datos=>{if(!datos.recordarPromocion)quitarLocal('wg_promocion'); $.fx.off=Boolean(datos.movimientoReducido)||matchMedia('(prefers-reduced-motion: reduce)').matches; };
  aplicarPreferencias(preferencias());
  const detenerMovimiento=e=>{if($.fx.off)e.target.getAnimations?.().forEach(a=>{try{a.finish();}catch{a.cancel();}});};
  document.addEventListener('transitionrun',detenerMovimiento,true);document.addEventListener('animationstart',detenerMovimiento,true);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>aplicarPreferencias(preferencias()));
  window.addEventListener('pagehide',()=>{clearInterval(timerModal);clearTimeout(toastTimer);cerrarAlmacenamiento();if(pendiente)cerrarModal();});
  if(promoPorRecuperar){const p=promociones.find(p=>p.id===Number(promoPorRecuperar));if(p&&promoVigente(p)){aplicarPromocion(p);irVista('inicio');}else quitarLocal('wg_promocion');promoPorRecuperar=null;}
  $(document).on('click','[data-accion="ajustes"]',async()=>{
    const modulo=await import('./ajustes.js').catch(()=>null);if(!modulo){toast('No se pudo abrir Ajustes. Revisa la conexión.');return;}const {abrirAjustes}=modulo;
    abrirAjustes({actualizar:buscarActualizacion,preferencias:aplicarPreferencias,exportar:exportarReservas,borrar:async()=>{reservas=[];ventas=[];await guardar();pintarSnacks();actualizarPaginas();actualizarUnidades();toast('Reservas y ventas borradas.');},retencion:async dias=>{if(!dias)return;const limite=Date.now()-dias*86400000;reservas=reservas.filter(r=>Date.parse(r.fin)>=limite);await guardar();}});
  });
  window.addEventListener('wg:vista',async()=>{if(document.body.dataset.pantalla==='contactos'){const modulo=await import('./contactos.js').catch(()=>null);if(modulo)modulo.completarContactos();else toast('No se pudieron cargar los enlaces de contacto.');}});
  const ampliar=document.createElement('button');ampliar.type='button';ampliar.className='btn secundario';ampliar.textContent='Necesito más tiempo';ampliar.addEventListener('click',()=>{if(pendiente){venceModal=Date.now()+30000;registrar('Tiempo de confirmación ampliado');}});document.querySelector('#modalReserva .acciones').prepend(ampliar);
  let bienvenidaPendiente=false;try{bienvenidaPendiente=preferencias().bienvenida&&!sessionStorage.getItem('wg_bienvenida');if(bienvenidaPendiente)sessionStorage.setItem('wg_bienvenida','1');}catch{}
  if(bienvenidaPendiente){const caja=document.createElement('div'),logo=document.createElement('img'),p=document.createElement('p');logo.src='./imagenes/robot.svg';logo.alt='WORLD GAMES';logo.width=80;logo.height=80;p.textContent='Tu equipo. Tu horario. Bienvenido a WORLD GAMES.';caja.append(logo,p);mostrarDialogo('WORLD GAMES',caja,[{texto:'Entrar',valor:true}]);}
  iniciarInterfaz();
  window.addEventListener("resize",actualizarPaginas);
  pintarHistorial();
  registrar("WORLD GAMES iniciado");
});

// El historial usa nodos de texto: los datos persistidos nunca se interpretan como HTML.
// El módulo secundario se solicita solo después de que exista una reserva o se abra el historial.
let versionHistorial=0;
async function pintarHistorial(){
 const lista=document.getElementById('listaHistorial');if(!lista||document.body.dataset.pantalla!=='historial')return;
 if(!reservas.length){lista.textContent='Todavía no tienes reservas guardadas en este navegador.';return;}
 const version=++versionHistorial;
 try {const modulo=await import('./historial.js');if(version===versionHistorial)modulo.pintarHistorial(reservas,equipos,productos);}
 catch{lista.textContent='No se pudo abrir el historial. Comprueba la conexión y vuelve a intentarlo.';}
}
// El estado comercial no se confunde con el indicador de conexión de la cabecera.
function actualizarHorario(){const e=document.getElementById('estadoComercial');if(!e)return;const h=estadoHorario();const texto=(h.abierto?'Abierto':'Cerrado')+' · Hoy: '+horaTexto(h.apertura)+'–'+horaTexto(h.cierre);if(e.textContent!==texto)e.textContent=texto;}
function exportarReservas(){const blob=new Blob([JSON.stringify({aplicacion:'WORLD GAMES',reservas},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='world-games-reservas.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}


