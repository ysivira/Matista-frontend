import { ApiError, NetworkError } from '../../shared/lib/httpClient.js'

/**
 * Mapea los detalles públicos de un VALIDATION_FAILED a errores por campo del formulario.
 * @param {unknown} error Error capturado por el cliente HTTP.
 * @returns {Record<string, string>} Diccionario campo → mensaje público; vacío si no aplica.
 */
export function fieldErrorsFromApiError(error) {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_FAILED' || !Array.isArray(error.details)) {
    return {}
  }
  /** @type {Record<string, string>} */
  const fieldErrors = {}
  for (const detail of error.details) {
    if (typeof detail?.field === 'string' && typeof detail?.message === 'string' && !(detail.field in fieldErrors)) {
      fieldErrors[detail.field] = detail.message
    }
  }
  return fieldErrors
}

/**
 * Construye el aviso de login según los códigos funcionales documentados por el contrato AUTH.
 * @param {unknown} error Error capturado al iniciar sesión.
 * @returns {{tone: 'success'|'warning'|'error'|'info', title: string, message: string, offerResend?: boolean}} Aviso accesible.
 */
export function loginNoticeFor(error) {
  const defaultMessage = 'Verifica tus datos e intenta nuevamente.'
  if (!(error instanceof ApiError)) {
    if (error instanceof NetworkError) {
      return { tone: 'error', title: 'Sin conexión con la API', message: error.message }
    }
    return { tone: 'error', title: 'No se pudo iniciar la sesión', message: defaultMessage }
  }
  switch (error.code) {
    case 'EMAIL_VERIFICATION_REQUIRED':
      // Permite recuperar el flujo sin enviar credenciales al backend otra vez.
      return { tone: 'error', title: 'Verifica tu correo electrónico', message: error.message, offerResend: true }
    case 'ACCOUNT_PENDING_APPROVAL':
      return { tone: 'warning', title: 'Cuenta pendiente de aprobación', message: error.message }
    case 'ACCOUNT_NOT_ACTIVE':
      return { tone: 'warning', title: 'Cuenta no habilitada', message: error.message }
    case 'RATE_LIMIT_EXCEEDED':
      return rateLimitNoticeFor(error)
    default:
      // Los mensajes del contrato son públicos y seguros para la interfaz.
      return { tone: 'error', title: 'No se pudo iniciar la sesión', message: error.message || defaultMessage }
  }
}

/**
 * Construye el aviso de límite de solicitudes confirmado por el backend (429 RATE_LIMIT_EXCEEDED).
 * @param {unknown} error Error capturado por una operación pública o personal de AUTH.
 * @returns {{tone: 'success'|'warning'|'error'|'info', title: string, message: string}|null} Aviso accesible; null cuando el código no es el confirmado por el contrato.
 */
export function rateLimitNoticeFor(error) {
  if (!(error instanceof ApiError) || error.code !== 'RATE_LIMIT_EXCEEDED') {
    return null
  }
  // El contrato expone un mensaje público sin duración ni Retry-After: no se inventan temporizadores ni reintentos automáticos.
  return { tone: 'warning', title: 'Demasiados intentos', message: error.message }
}

/**
 * Construye un aviso genérico para operaciones públicas distintas al login.
 * @param {unknown} error Error capturado por la operación.
 * @param {string} fallbackMessage Mensaje presentado cuando el error no transmite texto público.
 * @returns {{tone: 'success'|'warning'|'error'|'info', title: string, message: string}} Aviso accesible.
 */
export function technicalNoticeFor(error, fallbackMessage) {
  // El límite de solicitudes merece un tratamiento amable en todas las vistas que usan este traductor.
  const rateLimitNotice = rateLimitNoticeFor(error)
  if (rateLimitNotice) {
    return rateLimitNotice
  }
  if (error instanceof NetworkError) {
    return { tone: 'error', title: 'Sin conexión con la API', message: error.message }
  }
  return {
    tone: 'error',
    title: 'No se pudo completar la operación',
    message: error?.message || fallbackMessage,
  }
}
