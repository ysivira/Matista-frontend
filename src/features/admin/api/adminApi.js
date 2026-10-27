/**
 * MATISTA - Frontend · Administración
 * Archivo: adminApi.js
 *
 * RESPONSABILIDAD:
 * Cliente HTTP del módulo Administración; centraliza las llamadas a los endpoints del backend.
 *
 * CONTENIDO:
 * - Función createAdminApi.
 * - Constante adminApi.
 *
 * DEPENDENCIAS:
 * - ../../../shared/lib/httpClient.js
 */
import { httpClient } from '../../../shared/lib/httpClient.js';
const ADMIN_BASE_PATH = '/api/admin';

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
    const parameters = new URLSearchParams();
    if (filters.estado && filters.estado !== 'todos') parameters.set('estado', filters.estado);
    if (filters.rol && filters.rol !== 'todos') parameters.set('rol', filters.rol);
    if (filters.busqueda && filters.busqueda.trim()) parameters.set('busqueda',
      filters.busqueda.trim());
    const query = parameters.toString();
    return client.request(`${ADMIN_BASE_PATH}/employees${query ? `?${query}` : ''}`);
  }

  /** Recupera el detalle público de un empleado por su legajo. */
  function getEmployee(legajo) {
    return client.request(`${ADMIN_BASE_PATH}/employees/${legajo}`);
  }

  /** Aplica el cambio de estado con la matriz de transiciones del backend. */
  function changeEstado(legajo, estado) {
    return client.request(`${ADMIN_BASE_PATH}/employees/${legajo}/estado`, {
      method: 'PATCH',
      body: {
        estado
      }
    });
  }

  /** Aplica el cambio de rol entre ADMIN y ASESOR para cuentas ACTIVO. */
  function changeRol(legajo, rol) {
    return client.request(`${ADMIN_BASE_PATH}/employees/${legajo}/rol`, {
      method: 'PATCH',
      body: {
        rol
      }
    });
  }

  /**
   * Lista el catálogo de planes activos (RF-D06).
   * @returns {Promise<{planes: object[]}>} Planes con datos públicos sin precios.
   */
  function listarPlanes() {
    return client.request(`${ADMIN_BASE_PATH}/planes`);
  }

  /**
   * Consulta la matriz de tarifas vigente de un plan por modalidad (RF-D07).
   * @param {number|string} planId Identificador del plan del catálogo.
   * @param {string} tipoIngreso Modalidad exacta: "Obligatorio" o "Voluntario".
   * @returns {Promise<object>} Plan, modalidad, versión vigente y tarifas en orden comercial.
   */
  function consultarTarifario(planId, tipoIngreso) {
    const modalidad = encodeURIComponent(tipoIngreso);
    return client.request(`${ADMIN_BASE_PATH}/tarifario/planes/${planId}/${modalidad}`);
  }

  /** Lista el historial completo de versiones del tarifario (SL-3). */
  function listarVersiones() {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones`);
  }

  /**
   * Recupera una version HISTORICA como nuevo borrador en PREPARACION
   * (SL-5b): el backend copia fila a fila su snapshot sin alterar el
   * registro original; con un borrador pendiente devuelve 409 de
   * exclusividad con el responsable y como continuar.
   * @param {number|string} versionId Version historica seleccionada.
   * @returns {Promise<object>} Borrador creado, con version_base_id del origen.
   */
  function recuperarVersionHistorica(versionId) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/recuperacion`, {
      method: 'POST'
    });
  }

  /** Recupera la cabecera pública de una versión del historial (SL-3). */
  function obtenerVersion(versionId) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}`);
  }

  /** Lista el snapshot completo de tarifas de una versión, activas e inactivas (SL-3). */
  function listarTarifasVersion(versionId) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/tarifas`);
  }

  /**
   * Lee el resumen de cambios de una versión construido sobre la auditoría
   * real del backend (eventos 014), del más reciente al más antiguo.
   * @param {number|string} versionId Versión del historial.
   */
  function obtenerEventosVersion(versionId) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/eventos`);
  }

  /**
   * Crea el borrador de edición copiando la versión ACTIVA vigente (SL-4, caso A).
   * El cuerpo es irrelevante para el backend; se envía vacío por el contrato JSON.
   */
  function crearBorradorTarifario() {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones`, {
      method: 'POST',
      body: {}
    });
  }

  /**
   * Aplica el aumento masivo porcentual sobre las filas del borrador (SL-4, caso B).
   * @param {number|string} versionId Versión en PREPARACION.
   * @param {{porcentaje: string, tipoIngreso?: string, revision: string}} cuerpo Datos del aumento.
   */
  function aumentarVersion(versionId, cuerpo) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/aumentos`, {
      method: 'POST',
      body: cuerpo
    });
  }

  /**
   * Solicita al backend la previsualización del aumento masivo (solo lectura).
   * Los importes los calcula el servidor con la misma función económica del
   * aumento definitivo; React no implementa la regla de cálculo.
   * @param {number|string} versionId Versión del borrador.
   * @param {{porcentaje: string, tipoIngreso?: string}} parametros Porcentaje y modalidad opcional.
   * @returns {Promise<{version: object, porcentaje: string, tipo_ingreso: string|null, filas:
   * object[]}>} Importes por fila en DECIMAL.
   */
  function previsualizarAumentoVersion(versionId, {
    porcentaje,
    tipoIngreso
  }) {
    const parameters = new URLSearchParams({
      porcentaje
    });
    if (tipoIngreso) parameters.set('tipoIngreso', tipoIngreso);
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/aumentos/vista-previa?${parameters.toString()}`);
  }

  /**
   * Cambia el precio de una fila individual del borrador (SL-4, caso B).
   * @param {number|string} versionId Versión en PREPARACION.
   * @param {number|string} tarifaId Fila dentro del snapshot de la versión.
   * @param {{precio: string, revision: string}} cuerpo Precio nuevo y revisión optimista.
   */
  function editarPrecioTarifa(versionId, tarifaId, cuerpo) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/tarifas/${tarifaId}`, {
      method: 'PATCH',
      body: cuerpo
    });
  }

  /**
   * Cierra la edición: PREPARACION -> LISTA_PARA_ACTIVAR (SL-4, caso C).
   * @param {number|string} versionId Versión en PREPARACION.
   * @param {{revision: string}} cuerpo Revisión optimista del borrador.
   */
  function reanudarVersion(versionId) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/reanudacion`, {
      method: 'POST'
    });
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
      body: cuerpo
    });
  }
  /**
   * Finaliza una versión LISTA_PARA_ACTIVAR mediante su endpoint dedicado.
   * @param {string} versionId Identificador de la versión de tarifario.
   * @param {object} cuerpo Confirmación requerida por el contrato de finalización.
   * @returns {Promise<object>} Versión finalizada según la respuesta del backend.
   */
  function finalizarVersion(versionId, cuerpo) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/finalizacion`, {
      method: 'POST',
      body: cuerpo
    });
  }

  /**
   * Activación manual: LISTA_PARA_ACTIVAR -> ACTIVA reemplazando la vigente (SL-5, caso D).
   * @param {number|string} versionId Versión lista para activar.
   */
  function activarVersion(versionId) {
    return client.request(`${ADMIN_BASE_PATH}/tarifario/versiones/${versionId}/activacion`, {
      method: 'POST',
      body: {}
    });
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
      body: {
        revision: String(revision)
      }
    });
  }

  /**
   * Obtiene la política comercial actualmente vigente.
   * @returns {Promise<object>} Política comercial vigente.
   */
  function obtenerPoliticaComercial() {
    return client.request(`${ADMIN_BASE_PATH}/politica-comercial`);
  }

  /**
   * Actualiza la política comercial vigente o su programación pendiente.
   * El cuerpo puede llevar `activacion` ({ modo, fecha }) y `revision` para
   * editar una programación con concurrencia optimista.
   * @param {number|string} politicaId ID de la política comercial.
   * @param {object} datos Datos a actualizar.
   * @returns {Promise<object>} Política comercial actualizada.
   */
  function actualizarPoliticaComercial(politicaId, datos) {
    return client.request(`${ADMIN_BASE_PATH}/politica-comercial/${politicaId}`, {
      method: 'PUT',
      body: datos
    });
  }

  /** Recupera todas las versiones de política comercial con sus descuentos. */
  function listarHistorialPoliticaComercial() {
    return client.request(`${ADMIN_BASE_PATH}/politica-comercial/historial`);
  }

  /** Recupera el snapshot completo de una versión de política comercial. */
  function obtenerDetallePoliticaComercial(politicaId) {
    return client.request(`${ADMIN_BASE_PATH}/politica-comercial/${politicaId}`);
  }

  /** Reactiva un snapshot histórico creando una nueva versión vigente. */
  function recuperarPoliticaComercial(politicaId) {
    return client.request(`${ADMIN_BASE_PATH}/politica-comercial/${politicaId}/recuperacion`, {
      method: 'POST',
      body: {}
    });
  }

  /**
   * Cancela la única programación pendiente sin tocar la vigente.
   * @param {number|string} politicaId Programación pendiente.
   * @param {{revision: number|string, motivo: string}} cuerpo Revisión optimista y motivo
   * auditable.
   * @returns {Promise<{version: object, evento: object}>} Versión cancelada y evento.
   */
  function cancelarProgramacionPoliticaComercial(politicaId, cuerpo) {
    return client.request(`${ADMIN_BASE_PATH}/politica-comercial/${politicaId}/cancelacion`, {
      method: 'POST',
      body: cuerpo
    });
  }

  /**
   * Lista la auditoría de ciclo de vida de una versión con nombre y legajo
   * preservados por el backend (migración 023).
   * @param {number|string} politicaId Versión consultada.
   * @returns {Promise<object[]>} Eventos ordenados del más reciente al más antiguo.
   */
  function obtenerEventosPoliticaComercial(politicaId) {
    return client.request(`${ADMIN_BASE_PATH}/politica-comercial/${politicaId}/eventos`);
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
    previsualizarAumentoVersion,
    editarPrecioTarifa,
    finalizarVersion,
    reanudarVersion,
    descartarVersion,
    activarVersion,
    deshacerUltimoCambio,
    obtenerPoliticaComercial,
    actualizarPoliticaComercial,
    listarHistorialPoliticaComercial,
    obtenerDetallePoliticaComercial,
    recuperarPoliticaComercial,
    cancelarProgramacionPoliticaComercial,
    obtenerEventosPoliticaComercial
  };
}
export const adminApi = createAdminApi(httpClient);
