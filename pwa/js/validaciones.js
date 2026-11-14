// Reglas compartidas para comprobar formularios sin interpretar contenido HTML.
const letras=/^[\p{L}]+(?:[ '\-][\p{L}]+)*$/u;
const correo=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// El asistente comparte las mismas reglas para orientar el foco y para validar el envío.
export {letras as regexNombre,correo as regexCorreo};
export function validarIdentidad({nombre,apellido,email,telefono}) {
 return {nombre:nombre.length>=2&&nombre.length<=50&&letras.test(nombre),apellido:apellido.length>=2&&apellido.length<=60&&letras.test(apellido),correo:email.length<=100&&correo.test(email),telefono:/^[67]\d{7}$/.test(telefono)};
}
