/**
 * MATISTA - Frontend · Autenticación
 * Archivo: TemporaryAccountPage.jsx
 *
 * RESPONSABILIDAD:
 * Página TemporaryAccountPage del módulo Autenticación; compone componentes de la feature para su
 * caso de uso.
 *
 * CONTENIDO:
 * - Función TemporaryAccountPage.
 *
 * DEPENDENCIAS:
 * - react
 * - react-router-dom
 * - ../components/AuthLayout.jsx
 * - ../components/AuthAlert.jsx
 * - ../components/AuthFields.jsx
 * - ../hooks/useSession.js
 * - ../context/SessionContext.js
 * - ../../../shared/ui/LoadingState.jsx
 * - ../api/authApi.js
 * - ../../../shared/lib/httpClient.js
 * - ../auth.messages.js
 * - ../auth.validation.js
 */
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { AuthAlert } from '../components/AuthAlert.jsx';
import { PasswordField, TextField } from '../components/AuthFields.jsx';
import { useSession } from '../hooks/useSession.js';
import { SESSION_STATUS } from '../context/SessionContext.js';
import { LoadingState } from '../../../shared/ui/LoadingState.jsx';
import { authApi } from '../api/authApi.js';
import { ApiError } from '../../../shared/lib/httpClient.js';
import { fieldErrorsFromApiError, technicalNoticeFor } from '../auth.messages.js';
import { INVALID_EMAIL_MESSAGE, INVALID_PASSWORD_CONFIRMATION_MESSAGE, REQUIRED_FIELD_MESSAGE,
  isValidEmail } from '../auth.validation.js';

/**
 * Presenta la identidad de la sesión real y expone temporalmente las operaciones
 * personales de AUTH (cierre de sesión, cambio de contraseña y solicitud de cambio
 * de correo). Es una pantalla transitoria de validación integral: los módulos
 * definitivos ADMIN y ASESOR la reemplazarán consumiendo los mismos servicios.
 * @returns {import('react').ReactElement} Destino provisorio por rol bajo guards vigentes.
 */
export function TemporaryAccountPage() {
  const {
    status,
    user,
    logout,
    clearSession
  } = useSession();
  const [fieldErrors, setFieldErrors] = useState({});
  const [passwordNotice, setPasswordNotice] = useState(null);
  const [emailNotice, setEmailNotice] = useState(null);
  const [sessionNotice, setSessionNotice] = useState(null);
  const [passwordValues, setPasswordValues] = useState({
    current: '',
    next: '',
    confirmation: ''
  });
  const [emailValues, setEmailValues] = useState({
    email: '',
    currentPassword: ''
  });
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  if (status !== SESSION_STATUS.AUTHENTICATED || !user) {
    // Bootstrap en curso: espera con la señal de carga sin navegar (evita descartes prematuros).
    if (status === SESSION_STATUS.CHECKING) {
      return <AuthLayout>
          <LoadingState message="Recuperando tu sesión..." />
        </AuthLayout>;
    }
    // Sesión revocada o descartada: el sistema de rutas resuelve el destino.
    return <Navigate to="/login" replace />;
  }
  const fullName = [user.nombre, user.apellido].filter(Boolean).join(' ') || '—';

  /**
   * Traduce los errores del contrato a avisos sin exponer información sensible.
   * @param {unknown} error Error del cliente HTTP para la operación personal.
   * @returns {object} Aviso accesible para el formulario correspondiente.
   */
  function sensitiveNoticeFor(error) {
    // Códigos funcionales 400/409 con mensajes públicos del contrato; se reutilizan tal cual.
    if (error instanceof ApiError && ['CURRENT_PASSWORD_INVALID', 'CREDENTIALS_CHANGED',
      'EMAIL_UNCHANGED'].includes(error.code)) {
      return {
        tone: 'error',
        title: 'No se pudo completar la operación',
        message: error.message
      };
    }
    return technicalNoticeFor(error, 'No se pudo completar la operación. Intenta nuevamente.');
  }

  /**
   * Cierra la sesión con el mecanismo existente de SessionProvider; el guard redirige a /login.
   * @returns {Promise<void>} Finaliza al confirmarse el 204 o al presentar el fallo técnico.
   */
  async function handleLogout() {
    setSessionNotice(null);
    try {
      await logout();
    } catch (caught) {
      setSessionNotice(technicalNoticeFor(caught,
        'No se pudo cerrar la sesión. Intenta nuevamente.'));
    }
  }

  /**
   * Descarta localmente la sesión revocada por el backend tras el cambio de contraseña.
   * La re-renderización del guard resuelve la redirección al inicio de sesión.
   * @returns {void}
   */
  function leaveAfterPasswordChange() {
    clearSession();
  }

  /**
   * Envía el cambio de contraseña con los DTO exactos del contrato: currentPassword y newPassword.
   * @param {import('react').FormEvent<HTMLFormElement>} event Evento de envío del formulario.
   * @returns {Promise<void>} Finaliza confirmando el cambio o presentando los errores.
   */
  async function handlePasswordSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    /** @type {Record<string, string>} */
    const errors = {};
    if (!passwordValues.current) errors.current = REQUIRED_FIELD_MESSAGE;
    if (!passwordValues.next) errors.next = REQUIRED_FIELD_MESSAGE;
    if (!passwordValues.confirmation) {
      errors.confirmation = REQUIRED_FIELD_MESSAGE;
    } else if (!errors.next && passwordValues.next !== passwordValues.confirmation) {
      errors.confirmation = INVALID_PASSWORD_CONFIRMATION_MESSAGE;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setPasswordNotice(null);
      return;
    }
    setSubmitting(true);
    setPasswordNotice(null);
    try {
      // El backend revoca todas las sesiones y elimina la cookie; la contraseña actual deja de
      // usarse.
      await authApi.changePassword({
        currentPassword: passwordValues.current,
        newPassword: passwordValues.next
      });
      setPasswordValues({
        current: '',
        next: '',
        confirmation: ''
      });
      setPasswordChanged(true);
    } catch (caught) {
      const mappedErrors = fieldErrorsFromApiError(caught);
      if (Object.keys(mappedErrors).length > 0) {
        setFieldErrors(current => ({
          ...current,
          ...mappedErrors
        }));
      } else {
        setPasswordNotice(sensitiveNoticeFor(caught));
      }
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Solicita el cambio de correo conservando el actual hasta confirmar: el contrato exige
   * email nuevo y currentPassword, y mantiene el correo vigente la sesión no se revoca.
   * @param {import('react').FormEvent<HTMLFormElement>} event Evento de envío del formulario.
   * @returns {Promise<void>} Finaliza aceptando la solicitud o presentando los errores.
   */
  async function handleEmailSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    /** @type {Record<string, string>} */
    const errors = {};
    if (!emailValues.email.trim()) {
      errors.email = REQUIRED_FIELD_MESSAGE;
    } else if (!isValidEmail(emailValues.email.trim())) {
      errors.email = INVALID_EMAIL_MESSAGE;
    }
    if (!emailValues.currentPassword) errors.currentPassword = REQUIRED_FIELD_MESSAGE;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setEmailNotice(null);
      return;
    }
    setSubmitting(true);
    setEmailNotice(null);
    try {
      const response = await authApi.changeEmail({
        email: emailValues.email.trim().toLowerCase(),
        currentPassword: emailValues.currentPassword
      });
      setEmailValues({
        email: '',
        currentPassword: ''
      });
      if (response?.verificationDelivery === 'RETRY_REQUIRED') {
        // El backend no revierte la solicitud por fallo de envío: informa sin exponer datos SMTP.
        setEmailNotice({
          tone: 'warning',
          title: 'El correo de confirmación no se envió en este momento',
          message:
            'Tu solicitud quedó registrada. Podrás pedir el reenvío desde la interfaz definitiva, que consumirá el mismo servicio.'
        });
      } else {
        setEmailNotice({
          tone: 'success',
          title: 'Solicitud de cambio de correo recibida',
          message:
            'Enviamos un enlace de confirmación al correo indicado. Tu correo actual sigue operando hasta que confirmes el cambio.'
        });
      }
    } catch (caught) {
      const mappedErrors = fieldErrorsFromApiError(caught);
      if (Object.keys(mappedErrors).length > 0) {
        setFieldErrors(current => ({
          ...current,
          ...mappedErrors
        }));
      } else {
        setEmailNotice(sensitiveNoticeFor(caught));
      }
    } finally {
      setSubmitting(false);
    }
  }
  return <AuthLayout wide>
      <div className="auth-title-block">
        <h1 className="auth-title">{`Cuenta ${user.rol}`}</h1>
        <span className="auth-badge">Interfaz temporal de AUTH</span>
      </div>
      <p className="auth-lead">
        Pantalla transitoria de validación de autenticación: los módulos definitivos de ADMIN y
        ASESOR la reemplazarán. Los datos provienen de tu sesión real.
      </p>

      {sessionNotice ? <AuthAlert tone={sessionNotice.tone}
        title={sessionNotice.title}>{sessionNotice.message}</AuthAlert> : null}

      <dl className="auth-identity">
        <div className="auth-identity__row">
          <dt>Nombre</dt>
          <dd>{fullName}</dd>
        </div>
        <div className="auth-identity__row">
          <dt>Correo</dt>
          <dd>{user.email ?? '—'}</dd>
        </div>
        <div className="auth-identity__row">
          <dt>Rol</dt>
          <dd>{user.rol}</dd>
        </div>
      </dl>

      <button className="auth-button" type="button" onClick={() => void handleLogout()}>
        Cerrar sesión
      </button>

      <hr className="auth-divider" />

      {passwordChanged ? <AuthAlert tone="success" title="Contraseña actualizada">
          <p>Tu contraseña se actualizó correctamente y todas las sesiones fueron cerradas.</p>
          <button className="auth-button" type="button" onClick={leaveAfterPasswordChange}>
            Ir a iniciar sesión
          </button>
        </AuthAlert> : <form className="auth-form" noValidate
          onSubmit={event => void handlePasswordSubmit(event)}>
          <PasswordField id="account-current-password" label="Contraseña actual" required
            autoComplete="current-password" placeholder="Tu contraseña vigente" value={passwordValues.current}
            onValueChange={value => setPasswordValues(current => ({
        ...current,
        current: value
      }))} error={fieldErrors.current} />
          <PasswordField id="account-new-password" label="Nueva contraseña" required
            autoComplete="new-password" placeholder="Cree una contraseña segura"
            hint="La política vigente de contraseñas la aplica el servidor." value={passwordValues.next}
            onValueChange={value => setPasswordValues(current => ({
        ...current,
        next: value
      }))} error={fieldErrors.next} />
          <PasswordField id="account-new-password-confirmation" label="Confirmar nueva contraseña"
            required autoComplete="new-password" placeholder="Repetir la contraseña"
            value={passwordValues.confirmation} onValueChange={value => setPasswordValues(current => ({
        ...current,
        confirmation: value
      }))} error={fieldErrors.confirmation} />
          {passwordNotice ? <AuthAlert tone={passwordNotice.tone}
            title={passwordNotice.title}>{passwordNotice.message}</AuthAlert> : null}
          <button className="auth-button" type="submit" disabled={submitting}>
            {submitting ? 'Procesando...' : 'Cambiar contraseña'}
          </button>
        </form>}

      <hr className="auth-divider" />

      <form className="auth-form" noValidate onSubmit={event => void handleEmailSubmit(event)}>
        <TextField id="account-new-email" type="email" label="Correo nuevo" required
          autoComplete="email" placeholder="nuevo@email.com" value={emailValues.email}
          onValueChange={value => setEmailValues(current => ({
        ...current,
        email: value
      }))} error={fieldErrors.email} />
        <PasswordField id="account-email-password" label="Contraseña actual" required
          autoComplete="current-password" placeholder="Tu contraseña vigente"
          value={emailValues.currentPassword} onValueChange={value => setEmailValues(current => ({
        ...current,
        currentPassword: value
      }))} error={fieldErrors.currentPassword} />
        {emailNotice ? <AuthAlert tone={emailNotice.tone}
          title={emailNotice.title}>{emailNotice.message}</AuthAlert> : null}
        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting ? 'Procesando...' : 'Solicitar cambio de correo'}
        </button>
      </form>
    </AuthLayout>;
}
