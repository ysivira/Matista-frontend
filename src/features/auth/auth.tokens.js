/**
 * Extrae el token de seguridad desde el fragmento de la URL sin tocar otra query adicional.
 * El enlace previsto por el backend es FRONTEND_ORIGIN + ruta con el fragmento `#token=...`.
 * El fragmento nunca viaja en la petición HTTP; el token devuelto debe mantenerse solo en memoria.
 * @param {string} hash Fragmento crudo entregado por el router, incluido el carácter `#`.
 * @returns {string|null} Token utilizable o null cuando el enlace no lo incluye.
 */
export function extractAuthToken(hash) {
  if (typeof hash !== 'string' || hash.length <= 1) {
    return null
  }
  const token = new URLSearchParams(hash.slice(1)).get('token')
  if (typeof token !== 'string' || token.trim() === '') {
    return null
  }
  return token
}
