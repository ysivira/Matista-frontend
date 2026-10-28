/**
 * ============================================================
 * MATISTA | ETIQUETAS DE ESTADO
 * ============================================================
 *
 * Archivo: etiquetasEstado.js
 * Módulo: Utilidades compartidas
 *
 * Responsabilidad:
 * Traducir estados de versiones a etiquetas amigables y
 * conservar el valor original de estados no catalogados.
 *
 * ============================================================
 */
/** Etiquetas compartidas de los estados del DTO del tarifario. */
const ETIQUETAS_ESTADO = Object.freeze({
  PREPARACION: 'En preparación',
  LISTA_PARA_ACTIVAR: 'Lista para activar',
  ACTIVA: 'Activa',
  HISTORICA: 'Histórica',
  // El valor heredado CANCELADA (013, sin productor propio) es el estado
  // interno del descarte de versiones no activadas; en pantalla se
  // muestra 'Descartada' para no duplicar estados en el negocio.
  CANCELADA: 'Descartada'
});

/**
 * Traduce el estado del ciclo de vida del tarifario a una etiqueta amigable
 * para la pantalla; los demás estados (directorios) muestran su valor original.
 * @param {string} estado Estado del DTO público.
 * @returns {string} Etiqueta visible del chip.
 */
export function etiquetaEstado(estado) {
  return ETIQUETAS_ESTADO[estado] ?? String(estado ?? '');
}
