import { httpClient } from '../../../shared/lib/httpClient.js'

const AUTH_BASE_PATH = '/api/auth'

/**
 * Compone las operaciones AUTH sobre un cliente HTTP inyectable y sin estado de interfaz.
 * @param {{request: Function}} client Cliente HTTP compartido.
 * @returns {object} Operaciones correspondientes a los doce endpoints AUTH vigentes.
 */
export function createAuthApi(client) {
  /** Registra un asesor con el DTO exacto preparado por la futura pantalla de registro. */
  function register(payload) {
    return client.request(`${AUTH_BASE_PATH}/register`, { method: 'POST', body: payload })
  }

  /** Verifica el correo inicial mediante el token temporal recibido por enlace. */
  function verifyEmail(token) {
    return client.request(`${AUTH_BASE_PATH}/verify-email`, { method: 'POST', body: { token } })
  }

  /** Solicita de forma neutra un nuevo enlace para el correo indicado. */
  function resendVerification(email) {
    return client.request(`${AUTH_BASE_PATH}/resend-verification`, { method: 'POST', body: { email } })
  }

  /** Inicia sesión por correo y contraseña; la cookie queda bajo control del navegador. */
  function login(credentials) {
    return client.request(`${AUTH_BASE_PATH}/login`, { method: 'POST', body: credentials })
  }

  /** Cierra de forma idempotente la sesión presentada sin enviar un cuerpo JSON. */
  function logout() {
    return client.request(`${AUTH_BASE_PATH}/logout`, { method: 'POST' })
  }

  /** Solicita recuperación con la respuesta neutra definida por el backend. */
  function forgotPassword(email) {
    return client.request(`${AUTH_BASE_PATH}/forgot-password`, { method: 'POST', body: { email } })
  }

  /** Restablece la contraseña mediante token y contraseña nueva. */
  function resetPassword(payload) {
    return client.request(`${AUTH_BASE_PATH}/reset-password`, { method: 'POST', body: payload })
  }

  /** Recupera el perfil público que representa la sesión autorizada actual. */
  function getMe({ signal } = {}) {
    return client.request(`${AUTH_BASE_PATH}/me`, { signal })
  }

  /** Actualiza exclusivamente los campos personales enviados por una futura interfaz de perfil. */
  function updateMe(changes) {
    return client.request(`${AUTH_BASE_PATH}/me`, { method: 'PATCH', body: changes })
  }

  /** Solicita el cambio autenticado de contraseña. */
  function changePassword(payload) {
    return client.request(`${AUTH_BASE_PATH}/change-password`, { method: 'POST', body: payload })
  }

  /** Solicita el cambio autenticado de correo conservando el correo actual hasta confirmar. */
  function changeEmail(payload) {
    return client.request(`${AUTH_BASE_PATH}/change-email`, { method: 'POST', body: payload })
  }

  /** Confirma públicamente el cambio de correo mediante token de un solo uso. */
  function confirmEmailChange(token) {
    return client.request(`${AUTH_BASE_PATH}/confirm-email-change`, { method: 'POST', body: { token } })
  }

  return {
    register,
    verifyEmail,
    resendVerification,
    login,
    logout,
    forgotPassword,
    resetPassword,
    getMe,
    updateMe,
    changePassword,
    changeEmail,
    confirmEmailChange,
  }
}

export const authApi = createAuthApi(httpClient)
