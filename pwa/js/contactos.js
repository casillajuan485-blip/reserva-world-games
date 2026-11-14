import {enlaceSeguro} from './seguridad.js';
// El usuario decidió mantener los contactos ficticios y enlazar únicamente las páginas generales de las aplicaciones.
export function completarContactos() {
 const panel=document.querySelector('#vista-contactos .panel');if(!panel||panel.querySelector('[data-redes]'))return;
 const caja=document.createElement('div');caja.dataset.redes='generales';caja.className='acciones';
 for(const [texto,url] of [['WhatsApp','https://www.whatsapp.com/'],['Ubicación · Google Maps','https://www.google.com/maps/'],['Facebook','https://www.facebook.com/'],['Instagram','https://www.instagram.com/'],['TikTok','https://www.tiktok.com/']]){
  const seguro=enlaceSeguro(url);if(!seguro)continue;
  const a=document.createElement('a');a.className='btn secundario';a.textContent=texto;a.href=seguro;a.target='_blank';a.rel='noopener noreferrer';caja.append(a);
 }
 const aclaracion=document.createElement('p');aclaracion.className='ayuda';aclaracion.textContent='Enlaces a las aplicaciones. No son cuentas oficiales ni una ubicación real de esta microempresa ficticia.';panel.append(caja,aclaracion);
}
