import { useState } from 'react'
import { AdminLayout } from '../../admin/components/AdminLayout.jsx'
import { AuthAlert } from '../../auth/components/AuthAlert.jsx'
import { PasswordField, TextField } from '../../auth/components/AuthFields.jsx'
import { useSession } from '../../auth/hooks/useSession.js'
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
 * Mi perfil compartido por ADMIN y ASESOR (ruta /perfil): muestra los datos
 * de la sesión real y expone las operaciones personales de AUTH (cambio de
 * contraseña y solicitud de cambio de correo). El cierre de sesión vive en la
 * barra lateral del AdminLayout. La validación final siempre es del servidor.
 * @returns {import('react').ReactElement} Perfil propias de la cuenta operante.
 */
export function MiPerfilPage() {
  const { user } = useSession()
  const [fieldErrors, setFieldErrors] = useState({})
  const [passwordValues, setPasswordValues] = useState({ current: '', next: '', confirmation: '' })
  const [emailValues, setEmailValues] = useState({ email: '', currentPassword: '' })
  const [passwordNotice, setPasswordNotice] = useState(null)
  const [emailNotice, setEmailNotice] = useState(null)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const nombreCompleto = [user?.nombre, user?.apellido].filter(Boolean).join(' ') || '—'

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

  return (
    <AdminLayout section="Mi perfil">
      <div className="admin-profile">
        <h1 className="admin-title">Mi perfil</h1>
        <p className="admin-directory__lead">Se ven tus datos reales; la autorización y el estado los decide el servidor.</p>


        <dl className="admin-facts admin-profile__identity">
          <div><dt>Nombre</dt><dd>{nombreCompleto}</dd></div>
          <div><dt>Correo</dt><dd>{user?.email ?? '—'}</dd></div>
          <div><dt>Legajo</dt><dd>{user?.legajo ?? '—'}</dd></div>
          <div><dt>Rol</dt><dd>{user?.rol}</dd></div>
        </dl>

        {passwordChanged ? (
          <AuthAlert tone="success" title="Contraseña actualizada">
            <p>Tu contraseña se actualizó y todas las sesiones quedaron cerradas.</p>
            <p>Vuelve a iniciar sesión desde la barra lateral después de cerrar el módulo.</p>
          </AuthAlert>
        ) : (
          <section className="admin-profile__section" aria-label="Cambio de contraseña">
            <h2>Cambio de contraseña</h2>
            <form className="auth-form" noValidate onSubmit={(event) => void handlePasswordSubmit(event)}>
              <PasswordField
                id="perfil-current-password"
                label="Contraseña actual"
                required
                autoComplete="current-password"
                value={passwordValues.current}
                onValueChange={(value) => setPasswordValues((actual) => ({ ...actual, current: value }))}
                error={fieldErrors.current}
              />
              <PasswordField
                id="perfil-new-password"
                label="Nueva contraseña"
                required
                autoComplete="new-password"
                hint="La política vigente de contraseñas la aplica el servidor."
                value={passwordValues.next}
                onValueChange={(value) => setPasswordValues((actual) => ({ ...actual, next: value }))}
                error={fieldErrors.next}
              />
              <PasswordField
                id="perfil-confirm-password"
                label="Confirmar nueva contraseña"
                required
                autoComplete="new-password"
                value={passwordValues.confirmation}
                onValueChange={(value) => setPasswordValues((actual) => ({ ...actual, confirmation: value }))}
                error={fieldErrors.confirmation}
              />
              {passwordNotice ? (
                <AuthAlert tone={passwordNotice.tone} title={passwordNotice.title}>{passwordNotice.message}</AuthAlert>
              ) : null}
              <button className="admin-button" type="submit" disabled={submitting}>
                {submitting ? 'Procesando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </section>
        )}

        <section className="admin-profile__section" aria-label="Cambio de correo">
          <h2>Solicitud de cambio de correo</h2>
          <form className="auth-form" noValidate onSubmit={(event) => void handleEmailSubmit(event)}>
            <TextField
              id="perfil-new-email"
              type="email"
              label="Correo nuevo"
              required
              autoComplete="email"
              placeholder="nuevo@email.com"
              value={emailValues.email}
              onValueChange={(value) => setEmailValues((actual) => ({ ...actual, email: value }))}
              error={fieldErrors.email}
            />
            <PasswordField
              id="perfil-email-password"
              label="Contraseña actual"
              required
              autoComplete="current-password"
              value={emailValues.currentPassword}
              onValueChange={(value) => setEmailValues((actual) => ({ ...actual, currentPassword: value }))}
              error={fieldErrors.currentPassword}
            />
            {emailNotice ? (
              <AuthAlert tone={emailNotice.tone} title={emailNotice.title}>{emailNotice.message}</AuthAlert>
            ) : null}
            <button className="admin-button" type="submit" disabled={submitting}>
              {submitting ? 'Procesando...' : 'Solicitar cambio de correo'}
            </button>
          </form>
        </section>
      </div>
    </AdminLayout>
  )
}
