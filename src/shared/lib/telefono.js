/**
 * ============================================================
 * MATISTA | VALIDACIÓN DE TELÉFONO
 * ============================================================
 *
 * Archivo: telefono.js
 * Módulo: Utilidades compartidas
 *
 * Responsabilidad:
 * Validar teléfonos opcionales y compartir el mensaje público
 * de formato sin imponer una numeración nacional única.
 *
 * ============================================================
 */
/** Mensaje público estable para el feedback junto al campo y para el backend. */
export const TELEFONO_MENSAJE =
  'Número de teléfono inválido: use dígitos y, opcionalmente, el prefijo +, espacios, paréntesis o guiones.';

/**
 * Valida un teléfono opcional: vacío (o solo espacios) es válido; con
 * contenido, admite prefijo internacional `+`, dígitos, espacios, paréntesis
 * y guiones con una cantidad razonable de dígitos (mínimo 7, máximo 40
 * caracteres), sin imponer un formato argentino único. Rechaza letras y
 * caracteres no permitidos. El backend aplica la misma regla en
 * `asesor.validation.js`.
 * @param {unknown} valor Teléfono ingresado.
 * @returns {boolean} True solo cuando el valor es aceptable.
 */
export function esTelefonoValido(valor) {
  if (valor == null) return true;
  if (typeof valor !== 'string') return false;
  const limpio = valor.trim();
  if (!limpio) return true;
  if (limpio.length > 40) return false;
  return /^\+?[0-9 ()-]{6,40}$/.test(limpio) && (limpio.match(/\d/g) ?? []).length >= 7;
}
