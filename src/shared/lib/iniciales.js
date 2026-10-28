/**
 * ============================================================
 * MATISTA | INICIALES DE IDENTIDAD
 * ============================================================
 *
 * Archivo: iniciales.js
 * Módulo: Utilidades compartidas
 *
 * Responsabilidad:
 * Obtener las iniciales de nombre y apellido de la identidad
 * pública para su presentación en avatares.
 *
 * ============================================================
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
