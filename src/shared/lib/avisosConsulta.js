/**
 * Avisos de consulta y detección de sesiones vencidas.
 */
import { ApiError } from './httpClient.js';
import { technicalNoticeFor } from './avisosApi.js';

/** Códigos 401 por los que el backend avisa que la sesión ya no es válida. */
const CODIGOS_SESION_VENCIDA = Object.freeze(['SESSION_REQUIRED', 'ACCESS_TOKEN_INVALID',
  'SESSION_INVALID']);

/**
 * Detecta que el pedido llegó sin una sesión utilizable (cookie vencida o
 * ausente): la pantalla debe limpiar su estado local y pedir reinicio de
 * sesión cada vez que el backend responde eso, sin intenar reintentos
 * automáticos. No es neutral para servicios de ADMIN: la sessión sencillamente
 * no existe para este servidor.
 * @param {unknown} error Error capturado de un pedido ADMIN.
 * @returns {boolean} true cuando la sesión ya no sirve para operar.
 */
export function sesionCayoPara(error) {
  return error instanceof ApiError && error.status === 401
    && CODIGOS_SESION_VENCIDA.includes(error.code);
}

/** Códigos de negocio del contrato SL-2/SL-4/SL-5 que la interfaz puede explicar al ADMIN. */
const CODIGOS_CONSULTA_ADMIN = Object.freeze(['ADMIN_VALIDACION', 'ADMIN_NO_ENCONTRADO',
  'ADMIN_ESTADO', 'ADMIN_TRANSICION', 'ADMIN_CONCURRENCIA', 'ADMIN_INTEGRIDAD',
  'ADMIN_ROUTE_NOT_FOUND', 'SESSION_INVALID', 'ROLE_FORBIDDEN']);

/** Códigos de escritura del ciclo de borradores: el Rechazo es una operación, no una consulta. */
const CODIGOS_ESCRITURA_ADMIN = Object.freeze(['ADMIN_TRANSICION', 'ADMIN_CONCURRENCIA']);

/**
 * Traduce los códigos de negocio de la consulta SL-2 a avisos sin exponer
 * datos sensibles; los fallos técnicos quedan bajo el aviso neutro de AUTH.
 * @param {unknown} error Error del cliente HTTP.
 * @param {string} fallback Mensaje para fallos técnicos.
 * @returns {{title: string, message: string, tone: string}} Aviso accesible.
 */
export function avisoAdminPara(error,
  fallback = 'No se pudo completar la consulta. Intenta nuevamente.') {
  if (error instanceof ApiError && error.code && CODIGOS_CONSULTA_ADMIN.includes(error.code)) {
    const esEscritura = CODIGOS_ESCRITURA_ADMIN.includes(error.code);
    return {
      tone: 'error',
      title: esEscritura ? 'La operación fue rechazada' : 'La consulta fue rechazada',
      message: error.message
    };
  }
  return technicalNoticeFor(error, fallback);
}
