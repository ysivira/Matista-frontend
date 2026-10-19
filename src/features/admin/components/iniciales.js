/**
 * Obtiene las iniciales visibles de un empleado para el avatar.
 * @param {object} empleado Fila pública del backend.
 * @returns {string} Dos iniciales (nombre y apellido) o guión.
 */
export function inicialesDe(empleado) {
  const letraNombre = (empleado?.nombre || '')[0]
  const letraApellido = (empleado?.apellido || '')[0]
  return `${letraNombre ?? ''}${letraApellido ?? ''}` || '—'
}
