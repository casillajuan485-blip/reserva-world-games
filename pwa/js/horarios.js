// Horarios publicados en la página original: lunes-sábado 10–22, domingo 14–20.
export function horarioDelDia(fecha=new Date()) { return fecha.getDay()===0?{apertura:14*60,cierre:20*60}:{apertura:10*60,cierre:22*60}; }
// El fin puede coincidir con el cierre, pero una reserva nunca puede comenzar antes de abrir ni terminar después.
export function dentroHorario(inicio,fin) {
  if(!(inicio instanceof Date)||!(fin instanceof Date)||!Number.isFinite(+inicio)||!Number.isFinite(+fin)||fin<=inicio)return false;
  if(inicio.getFullYear()!==fin.getFullYear()||inicio.getMonth()!==fin.getMonth()||inicio.getDate()!==fin.getDate())return false;
  const h=horarioDelDia(inicio),a=inicio.getHours()*60+inicio.getMinutes(),b=fin.getHours()*60+fin.getMinutes();
  return a>=h.apertura&&b<=h.cierre;
}
// La indicación abierto/cerrado se calcula con el mismo horario utilizado para validar las reservas.
export function estadoHorario(ahora=new Date()) {
  const h=horarioDelDia(ahora),m=ahora.getHours()*60+ahora.getMinutes();
  return {abierto:m>=h.apertura&&m<h.cierre,...h};
}
export function horaTexto(minutos) { return String(Math.floor(minutos/60)).padStart(2,'0')+':'+String(minutos%60).padStart(2,'0'); }
