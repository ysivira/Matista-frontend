import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '../api/authApi.js'
import { AuthLayout } from '../components/AuthLayout.jsx'
import { AuthAlert } from '../components/AuthAlert.jsx'
import { LoadingState } from '../../../shared/ui/LoadingState.jsx'
import { extractAuthToken } from '../auth.tokens.js'
import { NetworkError } from '../../../shared/lib/httpClient.js'

const VIEW_STATUS = {
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
  INVALID: 'invalid',
}

/**
 * Confirma el correo inicial con el token del enlace. El token se extrae una única vez,
 * se elimina del historial visible de inmediato y permanece solo en memoria durante la operación.
 * @returns {import('react').ReactElement} Pantalla pública de confirmación de correo.
 */
export function VerifyEmailPage() {
  const location = useLocation()
  const navigate = useNavigate()
  // La inicialización diferida garantiza una única lectura del fragmento incluso en re-renderizados.
  const [token] = useState(() => extractAuthToken(location.hash))
  const hashClearedRef = useRef(false)
  const [status, setStatus] = useState(() => (extractAuthToken(location.hash) ? VIEW_STATUS.PROCESSING : VIEW_STATUS.INVALID))
  const [outcome, setOutcome] = useState(null)
  const [failure, setFailure] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (hashClearedRef.current) return
    hashClearedRef.current = true
    if (location.hash) {
      // El router ejecuta history.replaceState: el token deja de figurar en la URL visible al instante.
      navigate(`${location.pathname}${location.search}`, { replace: true })
    }
  }, [location.hash, location.pathname, location.search, navigate])

  useEffect(() => {
    if (!token) return
    let active = true
    authApi.verifyEmail(token)
      .then((response) => {
        if (!active) return
        // El backend admite correo recién verificado o ya confirmado; ambos despejan el flujo.
        setOutcome(response?.code === 'EMAIL_ALREADY_VERIFIED' ? 'ALREADY_VERIFIED' : 'VERIFIED')
        setStatus(VIEW_STATUS.SUCCESS)
      })
      .catch((caught) => {
        if (!active) return
        setFailure(caught)
        setStatus(VIEW_STATUS.ERROR)
      })
    return () => {
      active = false
    }
  }, [token, attempt])

  /**
   * Reintenta la verificación conservando el token en memoria aunque el fragmento ya no exista.
   * @returns {void}
   */
  function retry() {
    if (!token) return
    setFailure(null)
    setStatus(VIEW_STATUS.PROCESSING)
    setAttempt((current) => current + 1)
  }

  if (status === VIEW_STATUS.PROCESSING) {
    return (
      <AuthLayout>
        <span className="auth-badge">Confirmación de correo</span>
        <LoadingState message="Confirmando tu correo electrónico..." />
      </AuthLayout>
    )
  }

  if (status === VIEW_STATUS.INVALID) {
    return (
      <AuthLayout>
        <h1 className="auth-title">Confirmación de correo</h1>
        <p className="auth-lead">El enlace no incluye un token utilizable.</p>
        <AuthAlert tone="error" title="Enlace de confirmación inválido o expirado">
          El token de seguridad ha caducado o no acompaña a este enlace. Solicita un nuevo
          correo de confirmación para continuar.
        </AuthAlert>
        <div className="auth-actions">
          <Link className="auth-button" to="/resend-verification">Reenviar correo de confirmación</Link>
          <Link className="auth-link" to="/login">Volver a iniciar sesión</Link>
        </div>
      </AuthLayout>
    )
  }

  if (status === VIEW_STATUS.SUCCESS) {
    if (outcome === 'ALREADY_VERIFIED') {
      // Reenvío estable del contrato: sin efectos adicionales ni pista de compromiso.
      return (
        <AuthLayout>
          <h1 className="auth-title">Confirmación de correo</h1>
          <AuthAlert tone="info" title="El correo ya estaba confirmado">
            Tu dirección ya había sido verificada anteriormente. Continúa con tu acceso habitual.
          </AuthAlert>
          <div className="auth-actions">
            <Link className="auth-button" to="/login">Iniciar sesión</Link>
          </div>
        </AuthLayout>
      )
    }
    return (
      <AuthLayout>
        <h1 className="auth-title">Confirmación de correo</h1>
        <AuthAlert tone="success" title="Correo electrónico confirmado">
          Tu correo electrónico ha sido confirmado correctamente.
        </AuthAlert>
        <p className="auth-lead">
          La verificación no activa la cuenta automáticamente: queda pendiente de activación por
          un administrador. Recibirás el acceso cuando tu cuenta haya sido habilitada.
        </p>
        <div className="auth-actions">
          <Link className="auth-button" to="/login">Iniciar sesión</Link>
        </div>
      </AuthLayout>
    )
  }

  const invalidToken = failure?.name === 'ApiError' && failure.code === 'TOKEN_INVALID'
  return (
    <AuthLayout>
      <h1 className="auth-title">Confirmación de correo</h1>
      <AuthAlert tone="error" title="Enlace de confirmación inválido o expirado">
        {invalidToken
          ? 'El enlace ya no es válido. Puede haber expirado o haber sido utilizado anteriormente. Solicita un nuevo correo de confirmación.'
          : (failure instanceof NetworkError
            ? 'No se pudo contactar al servidor. Comprueba tu conexión para reintentar.'
            : (failure?.message || 'No se pudo confirmar el correo en este momento.'))}
      </AuthAlert>
      <div className="auth-actions">
        {invalidToken ? (
          <Link className="auth-button" to="/resend-verification">Reenviar correo de confirmación</Link>
        ) : (
          <button className="auth-button" type="button" onClick={retry}>Reintentar</button>
        )}
        <Link className="auth-link" to="/login">Volver a iniciar sesión</Link>
      </div>
    </AuthLayout>
  )
}
