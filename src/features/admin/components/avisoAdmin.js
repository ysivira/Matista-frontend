import { ApiError } from '../../../shared/lib/httpClient.js'
import { technicalNoticeFor } from '../../auth/auth.messages.js'

/** Códigos de negocio del contrato SL-2 que la interfaz puede explicar al ADMIN. */
const CODIGOS_CONSULTA_ADMIN = Object.freeze([
  'ADMIN_VALIDACION', 'ADMIN_NO_ENCONTRADO', 'ADMIN_ESTADO',
  'SESSION_INVALID', 'ROLE_FORBIDDEN',
])

/**
 * Traduce los códigos de negocio de la consulta SL-2 a avisos sin exponer
 * datos sensibles; los fallos técnicos quedan bajo el aviso neutro de AUTH.
 * @param {unknown} error Error del cliente HTTP.
 * @param {string} fallback Mensaje para fallos técnicos.
 * @returns {{title: string, message: string, tone: string}} Aviso accesible.
 */
export function avisoAdminPara(error, fallback = 'No se pudo completar la consulta. Intenta nuevamente.') {
  if (error instanceof ApiError && error.code && CODIGOS_CONSULTA_ADMIN.includes(error.code)) {
    return { tone: 'error', title: 'La consulta fue rechazada', message: error.message }
  }
  return technicalNoticeFor(error, fallback)
}
