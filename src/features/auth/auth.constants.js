/**
 * ============================================================
 * MATISTA | ROLES Y DESTINOS DE SESIÓN
 * ============================================================
 *
 * Archivo: auth.constants.js
 * Módulo: Autenticación
 *
 * Responsabilidad:
 * Definir roles, destinos y rutas privadas permitidas para el retorno del login.
 *
 * CONTENIDO:
 * - Constante AUTH_ROLES.
 * - Constante ACTIVE_ACCOUNT_STATUS.
 * - Constante ROLE_DESTINATION_PATHS.
 * - Constante PRIVATE_PATHS_BY_ROLE.
 * - Función isRolePrivatePath.
 * - Función destinationPathForRole.
 *
 * ============================================================
 */
export const AUTH_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  ASESOR: 'ASESOR'
});
export const ACTIVE_ACCOUNT_STATUS = 'ACTIVO';

/** Destinos de arranque por rol establecidos por la arquitectura de rutas de D.2. */
export const ROLE_DESTINATION_PATHS = Object.freeze({
  [AUTH_ROLES.ADMIN]: '/admin',
  [AUTH_ROLES.ASESOR]: '/asesor'
});

/**
 * Rutas privadas registradas para cada rol, en coincidencia exacta.
 * Las rutas anidadas o futuras deben incluirse aquí de forma explícita cuando el
 * router las autorice, nunca por prefijo: un path parecido (p. ej. /asesor-otra)
 * no cuenta como legítimo y no debe usarse como retorno tras el login.
 */
export const PRIVATE_PATHS_BY_ROLE = Object.freeze({
  [AUTH_ROLES.ADMIN]: Object.freeze(['/admin']),
  [AUTH_ROLES.ASESOR]: Object.freeze(['/asesor'])
});

/**
 * Indica si un path de retorno pertenece a las rutas privadas registradas del rol indicado.
 * @param {unknown} path Ruta candidata proveniente de `location.state.from` (no confiable).
 * @param {string} [role] Rol del usuario recién autenticado por el backend.
 * @returns {boolean} true solo si el path coincide exactamente con una ruta autorizada del rol.
 */
export function isRolePrivatePath(path, role) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    return false;
  }
  return (PRIVATE_PATHS_BY_ROLE[role] ?? []).includes(path);
}

/**
 * Resuelve la ruta transitoria que corresponde al rol autenticado tras iniciar sesión.
 * @param {string} [role] Rol del usuario devuelto por el backend.
 * @returns {string} Ruta de destino del módulo correspondiente o cuenta no disponible.
 */
export function destinationPathForRole(role) {
  return ROLE_DESTINATION_PATHS[role] ?? '/account-unavailable';
}
