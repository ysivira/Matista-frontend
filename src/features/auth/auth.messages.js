/**
 * ============================================================
 * MATISTA | AVISOS DE CUENTA
 * ============================================================
 *
 * Archivo: auth.messages.js
 * Módulo: Autenticación
 *
 * Responsabilidad:
 * Traducir errores públicos AUTH a avisos de login y mensajes por campo.
 *
 * CONTENIDO:
 * - Exporta rateLimitNoticeFor.
 * - Exporta technicalNoticeFor.
 * - Función fieldErrorsFromApiError.
 * - Función loginNoticeFor.
 *
 * DEPENDENCIAS:
 * - ../../shared/lib/httpClient.js
 * - ../../shared/lib/avisosApi.js
 *
 * ============================================================
 */
import { ApiError, NetworkError } from '../../shared/lib/httpClient.js';
import { rateLimitNoticeFor } from '../../shared/lib/avisosApi.js';
export { rateLimitNoticeFor, technicalNoticeFor } from '../../shared/lib/avisosApi.js';

/**
 * Mapea los detalles públicos de un VALIDATION_FAILED a errores por campo del formulario.
 * @param {unknown} error Error capturado por el cliente HTTP.
 * @returns {Record<string, string>} Diccionario campo → mensaje público; vacío si no aplica.
 */
export function fieldErrorsFromApiError(error) {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_FAILED'
    || !Array.isArray(error.details)) {
    return {};
  }
  /** @type {Record<string, string>} */
  const fieldErrors = {};
  for (const detail of error.details) {
    if (typeof detail?.field === 'string' && typeof detail?.message === 'string'
      && !(detail.field in fieldErrors)) {
      fieldErrors[detail.field] = detail.message;
    }
  }
  return fieldErrors;
}

/**
 * Construye el aviso de login según los códigos funcionales documentados por el contrato AUTH.
 * @param {unknown} error Error capturado al iniciar sesión.
 * @returns {{tone: 'success'|'warning'|'error'|'info', title: string, message: string,
 * offerResend?: boolean}} Aviso accesible.
 */
export function loginNoticeFor(error) {
  const defaultMessage = 'Verifica tus datos e intenta nuevamente.';
  if (!(error instanceof ApiError)) {
    if (error instanceof NetworkError) {
      return {
        tone: 'error',
        title: 'Sin conexión con la API',
        message: error.message
      };
    }
    return {
      tone: 'error',
      title: 'No se pudo iniciar la sesión',
      message: defaultMessage
    };
  }
  switch (error.code) {
    case 'EMAIL_VERIFICATION_REQUIRED':
      // Permite recuperar el flujo sin enviar credenciales al backend otra vez.
      return {
        tone: 'error',
        title: 'Verifica tu correo electrónico',
        message: error.message,
        offerResend: true
      };
    case 'ACCOUNT_PENDING_APPROVAL':
      return {
        tone: 'warning',
        title: 'Cuenta pendiente de aprobación',
        message: error.message
      };
    case 'ACCOUNT_NOT_ACTIVE':
      return {
        tone: 'warning',
        title: 'Cuenta no habilitada',
        message: error.message
      };
    case 'RATE_LIMIT_EXCEEDED':
      return rateLimitNoticeFor(error);
    default:
      // Los mensajes del contrato son públicos y seguros para la interfaz.
      return {
        tone: 'error',
        title: 'No se pudo iniciar la sesión',
        message: error.message || defaultMessage
      };
  }
}
