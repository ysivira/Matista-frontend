import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '../api/authApi.js'
import { AuthLayout } from '../components/AuthLayout.jsx'
import { AuthAlert } from '../components/AuthAlert.jsx'
import { LoadingState } from '../../../shared/ui/LoadingState.jsx'
import { useSession } from '../hooks/useSession.js'
import { SESSION_STATUS } from '../context/SessionContext.js'
import { extractAuthToken } from '../auth.tokens.js'
import { NetworkError } from '../../../shared/lib/httpClient.js'

const VIEW_STATUS = {
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
  INVALID: 'invalid',
}

/**
 * Confirma el cambio de correo mediante el token del enlace público. El token vive solo
 * en memoria y se retira del fragmento de la URL al instante. Al confirmarse, el backend
 * reemplaza el correo, revoca todas las sesiones y elimina la cookie; la confirmación
 * descarta localmente la sesión obsoleta sin restaurar estados ni emitir cookie nueva.
 * @returns {import('react').ReactElement} Pantalla pública de confirmación de cambio de correo.
 */
export function ConfirmEmailChangePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { status, clearSession } = useSession()
  // La inicialización diferida garantiza una única lectura del fragmento en re-renderizados.
  const [token] = useState(() => extractAuthToken(location.hash))
  const hashClearedRef = useRef(false)
  const [viewStatus, setViewStatus] = useState(() => (extractAuthToken(location.hash) ? VIEW_STATUS.PROCESSING : VIEW_STATUS.INVALID))
  const [newEmail, setNewEmail] = useState(null)
  const [failure, setFailure] = useState(null)
  const [attempt, setAttempt] = useState(0)
  // El estado de sesión se consulta por referencia para que la confirmación no dependa del bootstrap.
  const sessionStateRef = useRef({ status, clearSession })
  useEffect(() => {
    // Sincroniza la instantánea de sesión después de cada render: la confirmación lee el último valor estable.
    sessionStateRef.current = { status, clearSession }
  }, [status, clearSession])

  useEffect(() => {
    if (hashClearedRef.current) return
    hashClearedRef.current = true
    if (location.hash) {
      // history.replaceState ejecutado por el router: el token desaparece de la URL visible.
      navigate(`${location.pathname}${location.search}`, { replace: true })
    }
  }, [location.hash, location.pathname, location.search, navigate])

  useEffect(() => {
    if (!token) return
    let active = true
    authApi.confirmEmailChange(token)
      .then((response) => {
        if (!active) return
        setNewEmail(response?.newEmail ?? null)
        // Las sesiones ya fueron revocadas por el backend; una sesión local obsoleta se descarta en este navegador.
        const { status: currentStatus, clearSession: discardSession } = sessionStateRef.current
        if (currentStatus === SESSION_STATUS.AUTHENTICATED) discardSession()
        setViewStatus(VIEW_STATUS.SUCCESS)
      })
      .catch((caught) => {
        if (!active) return
        setFailure(caught)
        setViewStatus(VIEW_STATUS.ERROR)
      })
    return () => {
      active = false
    }
  }, [token, attempt])

  /**
   * Reintenta la confirmación conservando el token en memoria aunque el fragmento ya no exista.
   * @returns {void}
   */
  function retry() {
    if (!token) return
    setFailure(null)
    setViewStatus(VIEW_STATUS.PROCESSING)
    setAttempt((current) => current + 1)
  }

  if (viewStatus === VIEW_STATUS.PROCESSING) {
    return (
      <AuthLayout>
        <span className="auth-badge">Cambio de correo</span>
        <LoadingState message="Confirmando tu nuevo correo..." />
      </AuthLayout>
    )
  }

  if (viewStatus === VIEW_STATUS.SUCCESS) {
    return (
      <AuthLayout>
        <h1 className="auth-title">Confirmación de cambio de correo</h1>
        <AuthAlert tone="success" title="Correo electrónico actualizado">
          <p>
            {newEmail ? `Tu cuenta ahora utiliza <${newEmail}>.` : 'Tu correo fue actualizado correctamente.'}
            {' '}Las sesiones anteriores fueron cerradas por seguridad.
          </p>
        </AuthAlert>
        <p className="auth-lead">Inicia sesión con tu nuevo correo para volver a su cuenta.</p>
        <div className="auth-actions">
          <Link className="auth-button" to="/login">Iniciar sesión</Link>
        </div>
      </AuthLayout>
    )
  }

  if (viewStatus === VIEW_STATUS.INVALID) {
    return (
      <AuthLayout>
        <h1 className="auth-title">Confirmación de cambio de correo</h1>
        <p className="auth-lead">El enlace no incluye un token utilizable.</p>
        <AuthAlert tone="error" title="Enlace de confirmación inválido o expirado">
          El token de seguridad ha caducado o no acompaña a este enlace. Para obtener un nuevo
          enlace, inicia sesión con tu contraseña y solicita nuevamente el cambio de correo.
        </AuthAlert>
        <div className="auth-actions">
          <Link className="auth-button" to="/login">Volver a iniciar sesión</Link>
        </div>
      </AuthLayout>
    )
  }

  const invalidToken = failure?.name === 'ApiError' && failure.code === 'TOKEN_INVALID'
  return (
    <AuthLayout>
      <h1 className="auth-title">Confirmación de cambio de correo</h1>
      <AuthAlert tone="error" title="Enlace de confirmación inválido o expirado">
        {invalidToken
          ? 'El enlace ya no es válido: puede haber expirado, sido utilizado anteriormente o haberse reemplazado con una solicitud más reciente. Inicia sesión con tu contraseña y solicita nuevamente el cambio.'
          : (failure instanceof NetworkError
            ? 'No se pudo contactar al servidor. Comprueba tu conexión para reintentar.'
            : (failure?.message || 'No se pudo confirmar el cambio de correo en este momento.'))}
      </AuthAlert>
      <div className="auth-actions">
        {invalidToken ? (
          <Link className="auth-button" to="/login">Volver a iniciar sesión</Link>
        ) : (
          <button className="auth-button" type="button" onClick={retry}>Reintentar</button>
        )}
      </div>
    </AuthLayout>
  )
}
