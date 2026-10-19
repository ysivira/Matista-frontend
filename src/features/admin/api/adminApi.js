import { httpClient } from '../../../shared/lib/httpClient.js'

const ADMIN_BASE_PATH = '/api/admin'

/**
 * Compone las operaciones del directorio ADMIN sobre un cliente HTTP inyectable.
 * @param {{request: Function}} client Cliente HTTP compartido con cookie de sesión.
 * @returns {object} Operaciones aprobadas en el plan SPEC-03 (SL-1).
 */
export function createAdminApi(client) {
  /**
   * Lista empleados aplicando los filtros del directorio; los valores "todos" se omiten.
   * @param {{estado?: string, rol?: string, busqueda?: string}} [filters] Filtros del directorio.
   * @returns {Promise<{empleados: object[]}>} Listado público sin credenciales.
   */
  function listEmployees(filters = {}) {
    const parameters = new URLSearchParams()
    if (filters.estado && filters.estado !== 'todos') parameters.set('estado', filters.estado)
    if (filters.rol && filters.rol !== 'todos') parameters.set('rol', filters.rol)
    if (filters.busqueda && filters.busqueda.trim()) parameters.set('busqueda', filters.busqueda.trim())
    const query = parameters.toString()
    return client.request(`${ADMIN_BASE_PATH}/employees${query ? `?${query}` : ''}`)
  }

  /** Recupera el detalle público de un empleado por su legajo. */
  function getEmployee(legajo) {
    return client.request(`${ADMIN_BASE_PATH}/employees/${legajo}`)
  }

  /** Aplica el cambio de estado con la matriz de transiciones del backend. */
  function changeEstado(legajo, estado) {
    return client.request(`${ADMIN_BASE_PATH}/employees/${legajo}/estado`, {
      method: 'PATCH',
      body: { estado },
    })
  }

  /** Aplica el cambio de rol entre ADMIN y ASESOR para cuentas ACTIVO. */
  function changeRol(legajo, rol) {
    return client.request(`${ADMIN_BASE_PATH}/employees/${legajo}/rol`, {
      method: 'PATCH',
      body: { rol },
    })
  }

  return { listEmployees, getEmployee, changeEstado, changeRol }
}

export const adminApi = createAdminApi(httpClient)
