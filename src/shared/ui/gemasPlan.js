/**
 * Claves y colores de la paleta comercial según el nombre del plan.
 */
/**
 * Paleta de gemas del catálogo de planes aprobado en el módulo ASESOR
 * (Stitch «Catálogo de Planes de Salud»): cada plan tiene un color de acento
 * y una superficie de ícono. Los nombres fuera de la paleta usan el tono
 * slate de DIAMANTE, de modo que ningún plan quede sin representación.
 */

/** Paleta aprobada del catálogo ASESOR: color de la gema y superficie del ícono. */
const PALETA_GEMAS = Object.freeze({
  diamante: {
    color: '#64748b',
    fondo: '#f1f5f9'
  },
  esmeralda: {
    color: '#059669',
    fondo: '#ecfdf5'
  },
  zafiro: {
    color: '#2563eb',
    fondo: '#eff6ff'
  },
  rubi: {
    color: '#dc2626',
    fondo: '#fff1f2'
  }
});

/**
 * Normaliza un nombre de plan quitando diacríticos y mayúsculas para poder
 * compararlo contra la paleta sin depender de la ortografía exacta del
 * catálogo (por ejemplo «RUBÍ» y «PLAN RUBÍ» resuelven a la misma gema).
 * @param {string|null} nombre Nombre del plan entregado por la API.
 * @returns {string} Clave de paleta: diamante, esmeralda, zafiro, rubi o neutra.
 */
export function claveDePlan(nombre) {
  const normalizado = String(nombre ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,
    '').toUpperCase();
  if (normalizado.includes('DIAMANTE')) return 'diamante';
  if (normalizado.includes('ESMERALDA')) return 'esmeralda';
  if (normalizado.includes('ZAFIRO')) return 'zafiro';
  if (normalizado.includes('RUB')) return 'rubi';
  return 'neutra';
}

/**
 * Devuelve el color de acento del plan según la paleta aprobada; la gema
 * neutra hereda el tono slate de DIAMANTE para sostener un solo lenguaje.
 * @param {string|null} nombre Nombre del plan.
 * @returns {string} Color hexadecimal del plan.
 */
export function colorDePlan(nombre) {
  const clave = claveDePlan(nombre);
  return clave === 'neutra' ? PALETA_GEMAS.diamante.color : PALETA_GEMAS[clave].color;
}
