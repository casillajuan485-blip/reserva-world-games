// Los cálculos puros no acceden al DOM ni al almacenamiento y se pueden comprobar de forma aislada.
export function costoMinutos(precioHora,minutos){return Math.round(precioHora*100*minutos/60);}
export function textoDuracion(minutos){const h=Math.floor(minutos/60),m=minutos%60;return(h?h+' h ':'')+(m?m+' min':'');}
// El descuento de una promoción no puede dejar el importe final por debajo de cero.
export function totalPedido(juego,snacks,descuento){return Math.max(0,juego+snacks-descuento);}
