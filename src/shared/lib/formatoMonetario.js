/**
 * ============================================================
 * MATISTA | PRESENTACIÓN MONETARIA
 * ============================================================
 *
 * Archivo: formatoMonetario.js
 * Módulo: Utilidades compartidas
 *
 * Responsabilidad:
 * Presentar cadenas DECIMAL en pesos argentinos mediante texto,
 * sin aritmética, conversión a Number ni redondeo económico.
 *
 * ============================================================
 */
/** Formato compartido de importes: `$ 1.234.567,89` (punto de miles y coma decimal). */
const PATRON_PRECIO = /^-?\d+(\.\d+)?$/;

/**
 * Formatea visualmente la cadena decimal exacta del contrato SL-2 como importe
 * argentino con separador de miles punto, coma decimal y exactamente dos
 * decimales. La conversion es exclusivamente de presentacion: no realiza
 * aritmetica, no redondea y no convierte la cadena a `Number`, de modo que la
 * precision de MySQL `DECIMAL(12,2)` se conserva intacta. El recorte a dos
 * decimales solo aplicaria si el backend entregara mas de dos (contrato vigente
 * entrega siempre exactamente dos); nunca suma ni ajusta valores.
 * @param {string} precio Cadena decimal validada por el backend (por ejemplo `"404808.93"`).
 * @returns {string} Importe formateado `"$ 404.808,93"` o `"—"` cuando el valor
 *   falta o es invalido, para no exhibir NaN, undefined ni cadenas ambiguas.
 */
export function formatearPrecioARS(precio) {
  if (typeof precio !== 'string' || !PATRON_PRECIO.test(precio)) {
    return '—';
  }
  const [entero, decimales = ''] = precio.split('.');
  const negativo = entero.startsWith('-');
  const digitos = negativo ? entero.slice(1) : entero;
  // Agrupacion de miles por expresion regular sobre la propia cadena: sin operaciones numericas.
  const digitosConMiles = digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  // Dos decimales exactos: se completan con ceros a la derecha sin redondear.
  const dosDecimales = `${decimales}00`.slice(0, 2);
  return `${negativo ? '-' : ''}$ ${digitosConMiles},${dosDecimales}`;
}
