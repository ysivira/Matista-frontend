export const AUTH_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  ASESOR: 'ASESOR',
})

export const ACTIVE_ACCOUNT_STATUS = 'ACTIVO'

/** Destinos de arranque por rol establecidos por la arquitectura de rutas de D.2. */
export const ROLE_DESTINATION_PATHS = Object.freeze({
  [AUTH_ROLES.ADMIN]: '/admin',
  [AUTH_ROLES.ASESOR]: '/asesor',
})

/**
 * Resuelve la ruta transitoria que corresponde al rol autenticado tras iniciar sesión.
 * @param {string} [role] Rol del usuario devuelto por el backend.
 * @returns {string} Ruta de destino del módulo correspondiente o cuenta no disponible.
 */
export function destinationPathForRole(role) {
  return ROLE_DESTINATION_PATHS[role] ?? '/account-unavailable'
}
