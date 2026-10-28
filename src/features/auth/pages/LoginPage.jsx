/**
 * ============================================================
 * MATISTA | INICIO DE SESIÓN
 * ============================================================
 *
 * Archivo: LoginPage.jsx
 * Módulo: Autenticación
 *
 * Responsabilidad:
 * Autenticar por correo y contraseña y resolver el destino según la sesión y el rol.
 *
 * CONTENIDO:
 * - Función LoginPage.
 *
 * DEPENDENCIAS:
 * - react
 * - react-router-dom
 * - ../../../shared/ui/LoadingState.jsx
 * - ../components/AuthLayout.jsx
 * - ../components/AuthAlert.jsx
 * - ../components/AuthFields.jsx
 * - ../hooks/useSession.js
 * - ../context/SessionContext.js
 * - ../auth.constants.js
 * - ../auth.messages.js
 * - ../auth.validation.js
 *
 * ============================================================
 */
import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { LoadingState } from '../../../shared/ui/LoadingState.jsx';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { AuthAlert } from '../components/AuthAlert.jsx';
import { PasswordField, TextField } from '../components/AuthFields.jsx';
import { useSession } from '../hooks/useSession.js';
import { SESSION_STATUS } from '../context/SessionContext.js';
import { destinationPathForRole, isRolePrivatePath } from '../auth.constants.js';
import { loginNoticeFor } from '../auth.messages.js';
import { INVALID_EMAIL_MESSAGE, REQUIRED_FIELD_MESSAGE, isValidEmail } from '../auth.validation.js';

/**
 * Presenta el acceso público con correo y contraseña gestionado por la sesión HttpOnly del backend.
 * La autenticación no admite "recordar sesión", almacenamiento de tokens ni inicio por legajo.
 * @returns {import('react').ReactElement} Pantalla pública de inicio de sesión.
 */
export function LoginPage() {
  const {
    status,
    user,
    error,
    login,
    refreshSession
  } = useSession();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Única fuente de redirección tras iniciar sesión: la re-renderización por la sesión resuelta
  // respeta el `from` del guard de D.2 solo si pertenece a las rutas privadas registradas del
  // rol recién autenticado. Un path heredado de la sesión anterior con otro rol, una ruta
  // pública, externa o no reconocida se descarta a favor del destino por rol del backend; en
  // cualquier caso el guard ProtectedRoute sigue siendo el árbitro final de la autorización.
  if (status === SESSION_STATUS.AUTHENTICATED) {
    const fromPath = typeof location.state?.from === 'string' ? location.state.from : null;
    const fromState = fromPath && isRolePrivatePath(fromPath, user?.rol) ? fromPath : null;
    return <Navigate to={fromState ?? destinationPathForRole(user?.rol)} replace />;
  }
  if (status === SESSION_STATUS.CHECKING) {
    return <AuthLayout>
        <LoadingState message="Verificando sesión..." />
      </AuthLayout>;
  }
  if (status === SESSION_STATUS.ERROR) {
    return <AuthLayout>
        <h1 className="auth-title">No se pudo verificar la sesión</h1>
        <p className="auth-lead">Comprueba tu conexión e intenta nuevamente.</p>
        <AuthAlert tone="error" title="Fallo técnico temporal">
          {error?.message || 'No se pudo consultar la sesión en este momento.'}
        </AuthAlert>
        <div className="auth-links">
          <button className="auth-button" type="button" onClick={() => {
          void refreshSession().catch(() => undefined);
        }}>
            Reintentar
          </button>
          <Link className="auth-link" to="/">Volver al inicio</Link>
        </div>
      </AuthLayout>;
  }

  /**
   * Envía las credenciales por el servicio y SessionProvider existentes; evita envíos duplicados.
   * @param {import('react').FormEvent<HTMLFormElement>} event Evento de envío del formulario.
   * @returns {Promise<void>} Finaliza al navegar o al presentar el aviso contractual.
   */
  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    /** @type {Record<string, string>} */
    const errors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = REQUIRED_FIELD_MESSAGE;
    } else if (!isValidEmail(trimmedEmail)) {
      errors.email = INVALID_EMAIL_MESSAGE;
    }
    if (!password) {
      errors.password = REQUIRED_FIELD_MESSAGE;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setNotice(null);
      document.getElementById(Object.keys(errors)[0] === 'email' ? 'login-email' :
        'login-password')?.focus();
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      // El backend normaliza el correo; el envío con minúsculas mantiene la coherencia visual.
      // La redirección final la realiza la rama autenticada del propio componente al resolverse
      // la sesión, evitando carreras entre el destino por rol y la ruta privada de origen.
      await login({
        email: email.trim().toLowerCase(),
        password
      });
    } catch (caught) {
      setNotice(loginNoticeFor(caught));
    } finally {
      setSubmitting(false);
    }
  }
  return <AuthLayout>
      <div className="auth-title-block">
        <h1 className="auth-title">Iniciar Sesión</h1>
      </div>
      <p className="auth-lead">Ingresa a tu cuenta de gestión comercial.</p>

      {notice ? <AuthAlert tone={notice.tone} title={notice.title}>
          <p>{notice.message}</p>
          {notice.offerResend ? <Link className="auth-link"
            to="/resend-verification">Reenviar correo de verificación</Link> : null}
        </AuthAlert> : null}

      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <TextField id="login-email" type="email" label="Correo electrónico" required
          autoComplete="email" placeholder="ejemplo@email.com" value={email} onValueChange={setEmail}
          error={fieldErrors.email} />
        <PasswordField id="login-password" label="Contraseña" required
          autoComplete="current-password" placeholder="Tu contraseña" value={password}
          onValueChange={setPassword} error={fieldErrors.password} />
        <div className="auth-form-range">
          <Link className="auth-link" to="/forgot-password">¿Olvidaste tu contraseña?</Link>
        </div>
        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      <hr className="auth-divider" />
      <p className="auth-footer">
        ¿No tienes cuenta? <Link className="auth-link" to="/register">Regístrate</Link>
      </p>
    </AuthLayout>;
}
