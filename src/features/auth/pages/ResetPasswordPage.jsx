import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '../api/authApi.js'
import { AuthLayout } from '../components/AuthLayout.jsx'
import { AuthAlert } from '../components/AuthAlert.jsx'
import { PasswordField } from '../components/AuthFields.jsx'
import { extractAuthToken } from '../auth.tokens.js'
import {
  INVALID_PASSWORD_CONFIRMATION_MESSAGE,
  REQUIRED_FIELD_MESSAGE,
} from '../auth.validation.js'

const VIEW_STATUS = {
  FORM: 'form',
  SUCCESS: 'success',
  ERROR: 'error',
  INVALID: 'invalid',
}

/**
 * Restablece la contraseña mediante el token del enlace. El token se guarda solo en memoria,
 * se elimina del fragmento de la URL de inmediato y el backend decide sobre su vigencia.
 * @returns {import('react').ReactElement} Pantalla pública de restablecimiento de contraseña.
 */
export function ResetPasswordPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [token] = useState(() => extractAuthToken(location.hash))
  const hashClearedRef = useRef(false)
  const [status, setStatus] = useState(() => (extractAuthToken(location.hash) ? VIEW_STATUS.FORM : VIEW_STATUS.INVALID))
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (hashClearedRef.current) return
    hashClearedRef.current = true
    if (location.hash) {
      // history.replaceState ejecutado por el router: el token desaparece de la URL visible al instante.
      navigate(`${location.pathname}${location.search}`, { replace: true })
    }
  }, [location.hash, location.pathname, location.search, navigate])

  /**
   * Envía el restablecimiento con la política de contraseñas validada por el backend.
   * @param {import('react').FormEvent<HTMLFormElement>} event Evento de envío del formulario.
   * @returns {Promise<void>} Finaliza al confirmar el cambio o al presentar errores.
   */
  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return

    /** @type {Record<string, string>} */
    const errors = {}
    if (!password) errors.password = REQUIRED_FIELD_MESSAGE
    if (!confirmation) {
      errors.confirmation = REQUIRED_FIELD_MESSAGE
    } else if (!errors.password && password !== confirmation) {
      errors.confirmation = INVALID_PASSWORD_CONFIRMATION_MESSAGE
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    setFieldErrors({})
    setFormError('')
    try {
      // El contrato indica token y newPassword; la contraseña no se recorta ni normaliza.
      await authApi.resetPassword({ token, newPassword: password })
      setStatus(VIEW_STATUS.SUCCESS)
    } catch (caught) {
      if (caught?.name === 'ApiError' && caught.code === 'TOKEN_INVALID') {
        setStatus(VIEW_STATUS.INVALID)
      } else {
        setFormError(caught?.message || 'No se pudo restablecer la contraseña. Intenta nuevamente.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (status === VIEW_STATUS.SUCCESS) {
    return (
      <AuthLayout>
        <h1 className="auth-title">Contraseña actualizada</h1>
        <AuthAlert tone="success" title="Restablecimiento completado">
          Tu contraseña se actualizó correctamente y todas las sesiones activas fueron cerradas
          por seguridad.
        </AuthAlert>
        <p className="auth-lead">Ya puedes ingresar con la nueva contraseña.</p>
        <div className="auth-actions">
          <Link className="auth-button" to="/login">Iniciar sesión</Link>
        </div>
      </AuthLayout>
    )
  }

  if (status === VIEW_STATUS.INVALID) {
    return (
      <AuthLayout>
        <h1 className="auth-title">Restablecer Contraseña</h1>
        <p className="auth-lead">El enlace de restablecimiento no puede utilizarse.</p>
        <AuthAlert tone="error" title="Enlace de restablecimiento inválido o expirado">
          {formError || 'El token ya no es válido: puede haber expirado, sido utilizado con anterioridad o haberse reemplazado con un enlace más reciente.'}
        </AuthAlert>
        <div className="auth-actions">
          <Link className="auth-button" to="/forgot-password">Solicitar un nuevo enlace</Link>
          <Link className="auth-link" to="/login">Volver a iniciar sesión</Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="auth-title">Restablecer Contraseña</h1>
      <p className="auth-lead">
        Ingresa y confirma tu nueva contraseña para recuperar el acceso a tu cuenta.
      </p>

      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <PasswordField
          id="reset-password"
          label="Nueva contraseña"
          required
          autoComplete="new-password"
          placeholder="Cree una contraseña segura"
          hint="La política vigente de contraseñas la aplica el servidor."
          value={password}
          onValueChange={setPassword}
          error={fieldErrors.password}
        />
        <PasswordField
          id="reset-confirmation"
          label="Confirmar nueva contraseña"
          required
          autoComplete="new-password"
          placeholder="Repita la contraseña"
          value={confirmation}
          onValueChange={setConfirmation}
          error={fieldErrors.confirmation}
        />
        {formError ? (
          <AuthAlert tone="error" title="No se pudo restablecer la contraseña">
            {formError}
          </AuthAlert>
        ) : null}
        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting ? 'Restableciendo...' : 'Restablecer contraseña'}
        </button>
      </form>

      <hr className="auth-divider" />
      <p className="auth-footer">
        <Link className="auth-link" to="/login">Volver a iniciar sesión</Link>
      </p>
    </AuthLayout>
  )
}
