// Se reactiva una sola vez al abrir esta actualización; recargar no prolonga los tres días.
export const CAMPANA='world-games-reactivada-2026-11-13-72h';
export const DIAS_PROMOCION=3;
export function activarCampana(anterior,ahora=Date.now()) {
 if(anterior?.campana===CAMPANA&&Number.isFinite(anterior.inicio)&&anterior.inicio>0)return anterior;
 return {campana:CAMPANA,inicio:ahora};
}
export function finCampana(inicio){return inicio+DIAS_PROMOCION*24*60*60*1000;}
