import { useState } from 'react'
import { authApi } from '../../auth/api/authApi.js'
import { ApiError } from '../../../shared/lib/httpClient.js'
import { fieldErrorsFromApiError, technicalNoticeFor } from '../../auth/auth.messages.js'
import {
  INVALID_EMAIL_MESSAGE,
  INVALID_PASSWORD_CONFIRMATION_MESSAGE,
  REQUIRED_FIELD_MESSAGE,
  isValidEmail,
} from '../../auth/auth.validation.js'

/**
 * Traduce los errores operativos de AUTH a avisos sin exponer información.
 * @param {unknown} error Error del cliente HTTP.
 * @returns {{tone: string, title: string, message: string}} Aviso accesible.
 */
function avisoSensible(error) {
  if (error instanceof ApiError && [
    'CURRENT_PASSWORD_INVALID', 'CREDENTIALS_CHANGED', 'EMAIL_UNCHANGED',
  ].includes(error.code)) {
    return { tone: 'error', title: 'No se pudo completar la operación', message: error.message }
  }
  return technicalNoticeFor(error, 'No se pudo completar la operación. Intenta nuevamente.')
}

/**
 * Estado y operaciones personales de AUTH (cambio de contraseña y solicitud
 * de cambio de correo) compartidos por la página «Mi perfil» y el modal de
 * cuenta del AdminLayout. Toda validación final la aplica el servidor.
 * @returns {{fieldErrors: Record<string,string>, passwordValues: {current:string,next:string,confirmation:string}, emailValues: {email:string,currentPassword:string}, passwordNotice: (object|null), emailNotice: (object|null), passwordChanged: boolean, submitting: boolean, handlePasswordSubmit: (FormEvent) => Promise<void>, handleEmailSubmit: (FormEvent) => Promise<void>, setPasswordValues: (updater) => void, setEmailValues: (updater) => void}} Estado y envíos de los formularios.
 */
export function usePerfilAcciones() {
  const [fieldErrors, setFieldErrors] = useState({})
  const [passwordValues, setPasswordValues] = useState({ current: '', next: '', confirmation: '' })
  const [emailValues, setEmailValues] = useState({ email: '', currentPassword: '' })
  const [passwordNotice, setPasswordNotice] = useState(null)
  const [emailNotice, setEmailNotice] = useState(null)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  /**
   * Envía el cambio de contraseña con el DTO del contrato y avisa el cierre de sesiones.
   * @param {import('react').FormEvent<HTMLFormElement>} event Evento del formulario.
   * @returns {Promise<void>} Finaliza confirmando el cambio o mostrando errores.
   */
  async function handlePasswordSubmit(event) {
    event.preventDefault()
    if (submitting) return

    /** @type {Record<string, string>} */
    const errors = {}
    if (!passwordValues.current) errors.current = REQUIRED_FIELD_MESSAGE
    if (!passwordValues.next) errors.next = REQUIRED_FIELD_MESSAGE
    if (!passwordValues.confirmation) {
      errors.confirmation = REQUIRED_FIELD_MESSAGE
    } else if (!errors.next && passwordValues.next !== passwordValues.confirmation) {
      errors.confirmation = INVALID_PASSWORD_CONFIRMATION_MESSAGE
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    setPasswordNotice(null)
    try {
      await authApi.changePassword({
        currentPassword: passwordValues.current,
        newPassword: passwordValues.next,
      })
      setPasswordValues({ current: '', next: '', confirmation: '' })
      setPasswordChanged(true)
    } catch (caught) {
      const mapped = fieldErrorsFromApiError(caught)
      if (Object.keys(mapped).length > 0) {
        setFieldErrors((current) => ({ ...current, ...mapped }))
      } else {
        setPasswordNotice(avisoSensible(caught))
      }
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Solicita el cambio de correo sin revocar la sesión ni el correo vigente.
   * @param {import('react').FormEvent<HTMLFormElement>} event Evento del formulario.
   * @returns {Promise<void>} Finaliza registrando la solicitud o con errores.
   */
  async function handleEmailSubmit(event) {
    event.preventDefault()
    if (submitting) return

    /** @type {Record<string, string>} */
    const errors = {}
    const correo = emailValues.email.trim()
    if (!correo) {
      errors.email = REQUIRED_FIELD_MESSAGE
    } else if (!isValidEmail(correo)) {
      errors.email = INVALID_EMAIL_MESSAGE
    }
    if (!emailValues.currentPassword) errors.currentPassword = REQUIRED_FIELD_MESSAGE
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    setEmailNotice(null)
    try {
      const respuesta = await authApi.changeEmail({
        email: correo.toLowerCase(),
        currentPassword: emailValues.currentPassword,
      })
      setEmailValues({ email: '', currentPassword: '' })
      if (respuesta?.verificationDelivery === 'RETRY_REQUIRED') {
        setEmailNotice({
          tone: 'warning',
          title: 'El correo de confirmación no se envió en este momento',
          message: 'Tu solicitud quedó registrada; podrás pedir el reenvío en este módulo.',
        })
      } else {
        setEmailNotice({
          tone: 'success',
          title: 'Solicitud de cambio de correo recibida',
          message: 'Enviamos un enlace de confirmación al correo indicado; tu correo actual sigue operando.',
        })
      }
    } catch (caught) {
      const mapped = fieldErrorsFromApiError(caught)
      if (Object.keys(mapped).length > 0) {
        setFieldErrors((current) => ({ ...current, ...mapped }))
      } else {
        setEmailNotice(avisoSensible(caught))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return {
    fieldErrors, passwordValues, emailValues, passwordNotice, emailNotice,
    passwordChanged, submitting, setPasswordValues, setEmailValues,
    handlePasswordSubmit, handleEmailSubmit,
  }
}
