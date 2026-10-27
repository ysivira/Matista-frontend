/**
 * Iniciales de identificación para avatares de la interfaz.
 */
/**
 * Obtiene las iniciales visibles de una identidad pública para el avatar compartido.
 * @param {object} empleado Fila pública del backend.
 * @returns {string} Dos iniciales (nombre y apellido) o guión.
 */
export function inicialesDe(empleado) {
  const letraNombre = (empleado?.nombre || '')[0];
  const letraApellido = (empleado?.apellido || '')[0];
  return `${letraNombre ?? ''}${letraApellido ?? ''}` || '—';
}
