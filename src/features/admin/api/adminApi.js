import { httpClient } from '../../../shared/lib/httpClient.js'

const ADMIN_BASE_PATH = '/api/admin'

/**
 * Compone las operaciones del módulo ADMIN (directorio SL-1 y catálogo de
 * planes/tarifario SL-2) sobre un cliente HTTP inyectable.
 * @param {{request: Function}} client Cliente HTTP compartido con cookie de sesión.
 * @returns {object} Operaciones aprobadas en el plan SPEC-03.
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

  /**
   * Lista el catálogo de planes activos (RF-D06).
   * @returns {Promise<{planes: object[]}>} Planes con datos públicos sin precios.
   */
  function listarPlanes() {
    return client.request(`${ADMIN_BASE_PATH}/planes`)
  }

  /**
   * Consulta la matriz de tarifas vigente de un plan por modalidad (RF-D07).
   * @param {number|string} planId Identificador del plan del catálogo.
   * @param {string} tipoIngreso Modalidad exacta: "Obligatorio" o "Voluntario".
   * @returns {Promise<object>} Plan, modalidad, versión vigente y tarifas en orden comercial.
   */
  function consultarTarifario(planId, tipoIngreso) {
    const modalidad = encodeURIComponent(tipoIngreso)
    return client.request(`${ADMIN_BASE_PATH}/tarifario/planes/${planId}/${modalidad}`)
  }

  return { listEmployees, getEmployee, changeEstado, changeRol, listarPlanes, consultarTarifario }
}

export const adminApi = createAdminApi(httpClient)
