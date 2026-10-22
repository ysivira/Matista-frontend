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

  /** Lista el historial completo de versiones del tarifario (SL-3). */
  function listarVersiones() {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones`)
  }

  /**
   * Recupera una version HISTORICA como nuevo borrador en PREPARACION
   * (SL-5b): el backend copia fila a fila su snapshot sin alterar el
   * registro original; con un borrador pendiente devuelve 409 de
   * exclusividad con el responsable y como continuar.
   * @param {number|string} versionId Version historica seleccionada.
   * @returns {Promise<object>} Borrador creado, con version_base_id del origen.
   */
  function recuperarVersionHistorica(versionId) {    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/recuperacion`, {
      method: 'POST',
    })
  }

  /** Recupera la cabecera pública de una versión del historial (SL-3). */
  function obtenerVersion(versionId) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}`)
  }

  /** Lista el snapshot completo de tarifas de una versión, activas e inactivas (SL-3). */
  function listarTarifasVersion(versionId) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/tarifas`)
  }

  /**
   * Lee el resumen de cambios de una versión construido sobre la auditoría
   * real del backend (eventos 014), del más reciente al más antiguo.
   * @param {number|string} versionId Versión del historial.
   */
  function obtenerEventosVersion(versionId) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/eventos`)
  }

  /**
   * Crea el borrador de edición copiando la versión ACTIVA vigente (SL-4, caso A).
   * El cuerpo es irrelevante para el backend; se envía vacío por el contrato JSON.
   */
  function crearBorradorTarifario() {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones`, {
      method: 'POST',
      body: {},
    })
  }

  /**
   * Aplica el aumento masivo porcentual sobre las filas del borrador (SL-4, caso B).
   * @param {number|string} versionId Versión en PREPARACION.
   * @param {{porcentaje: string, tipoIngreso?: string, revision: string}} cuerpo Datos del aumento.
   */
  function aumentarVersion(versionId, cuerpo) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/aumentos`, {
      method: 'POST',
      body: cuerpo,
    })
  }

  /**
   * Cambia el precio de una fila individual del borrador (SL-4, caso B).
   * @param {number|string} versionId Versión en PREPARACION.
   * @param {number|string} tarifaId Fila dentro del snapshot de la versión.
   * @param {{precio: string, revision: string}} cuerpo Precio nuevo y revisión optimista.
   */
  function editarPrecioTarifa(versionId, tarifaId, cuerpo) {
    return client.request(
      `${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/tarifas/${tarifaId}`,
      { method: 'PATCH', body: cuerpo },
    )
  }

  /**
   * Cierra la edición: PREPARACION -> LISTA_PARA_ACTIVAR (SL-4, caso C).
   * @param {number|string} versionId Versión en PREPARACION.
   * @param {{revision: string}} cuerpo Revisión optimista del borrador.
   */
  function reanudarVersion(versionId) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/reanudacion`, {
      method: 'POST',
    })
  }

  /**
   * Descarta una version no activada (PREPARACION o LISTA_PARA_ACTIVAR):
   * el backend cambia el estado interno a CANCELADA (mostrado como
   * «Descartada») con evento DESCARTE auditado, conservando precios,
   * numeracion y la vigencia; libera la creacion de borradores.
   * @param {number|string} versionId Version pendiente (PREPARACION o LISTA_PARA_ACTIVAR).
   * @param {{revision: number|string, motivo: string}} cuerpo Revision vigente y motivo.
   * @returns {Promise<object>} `{ version, evento }` del descarte.
   */
  function descartarVersion(versionId, cuerpo) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/descarte`, {
      method: 'POST',
      body: cuerpo,
    })
  }

  function finalizarVersion(versionId, cuerpo) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/finalizacion`, {
      method: 'POST',
      body: cuerpo,
    })
  }

  /**
   * Activación manual: LISTA_PARA_ACTIVAR -> ACTIVA reemplazando la vigente (SL-5, caso D).
   * @param {number|string} versionId Versión lista para activar.
   */
  function activarVersion(versionId) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/activacion`, {
      method: 'POST',
      body: {},
    })
  }

  /**
   * Deshace el último cambio económico vigente de un borrador en PREPARACION
   * (edición individual o aumento masivo completo), con revisión optimista.
   * @param {number|string} versionId Versión en PREPARACION.
   * @param {number|string} revision Revisión vigente del borrador.
   */
  function deshacerUltimoCambio(versionId, revision) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/deshacer`, {
      method: 'POST',
      body: { revision: String(revision) },
    })
  }

  return {
    listEmployees,
    getEmployee,
    changeEstado,
    changeRol,
    listarPlanes,
    consultarTarifario,
    listarVersiones,
    obtenerVersion,
    listarTarifasVersion,
    obtenerEventosVersion,
    crearBorradorTarifario,
    recuperarVersionHistorica,
    aumentarVersion,
    editarPrecioTarifa,
    finalizarVersion,
    reanudarVersion,
    descartarVersion,
    activarVersion,
    deshacerUltimoCambio,
  }
}

export const adminApi = createAdminApi(httpClient)
