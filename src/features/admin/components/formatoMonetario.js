/**
 * ============================================================
 * MATISTA | COMPATIBILIDAD DEL FORMATO MONETARIO
 * ============================================================
 *
 * Archivo: formatoMonetario.js
 * Módulo: Administración
 *
 * Responsabilidad:
 * Reexportar el formato de pesos argentinos sin recalcular importes.
 *
 * CONTENIDO:
 * - Exporta formatearPrecioARS.
 *
 * DEPENDENCIAS:
 * - ../../../shared/lib/formatoMonetario.js
 *
 * OBSERVACIONES:
 * Se conserva el contrato de presentación; no se traslada ni modifica aritmética.
 *
 * ============================================================
 */
export { formatearPrecioARS } from '../../../shared/lib/formatoMonetario.js';
