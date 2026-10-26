/**
 * Calcula años cumplidos desde AAAA-MM-DD con fecha de referencia UTC.
 * @param {string|null} nacimiento Fecha civil real, sin conversión de zona horaria.
 * @param {Date} referencia Instante de referencia (por defecto, actual).
 * @returns {number|null} Edad o null ante fecha imposible/futura o referencia inválida.
 * El 29/02 cumple años el 1/03 en años no bisiestos, igual que el dominio backend.
 */
export function calcularEdad(nacimiento, referencia = new Date()) {
  if (typeof nacimiento !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(nacimiento) || Number.isNaN(referencia.getTime())) return null
  const [ano, mes, dia] = nacimiento.split('-').map(Number)
  const fecha = new Date(Date.UTC(ano, mes - 1, dia))
  if (fecha.getUTCFullYear() !== ano || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null
  const hoy = referencia.toISOString().slice(0, 10)
  if (nacimiento > hoy) return null
  let edad = referencia.getUTCFullYear() - ano
  if (mes > referencia.getUTCMonth() + 1 || (mes === referencia.getUTCMonth() + 1 && dia > referencia.getUTCDate())) edad -= 1
  return edad
}
