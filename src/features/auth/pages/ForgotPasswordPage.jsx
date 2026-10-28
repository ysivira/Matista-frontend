/**
 * ============================================================
 * MATISTA | SOLICITUD DE RECUPERACIÓN
 * ============================================================
 *
 * Archivo: ForgotPasswordPage.jsx
 * Módulo: Autenticación
 *
 * Responsabilidad:
 * Solicitar recuperación por correo y mostrar una confirmación neutra.
 *
 * CONTENIDO:
 * - Función ForgotPasswordPage.
 *
 * DEPENDENCIAS:
 * - react
 * - react-router-dom
 * - ../api/authApi.js
 * - ../components/AuthLayout.jsx
 * - ../components/AuthAlert.jsx
 * - ../components/AuthFields.jsx
 * - ../auth.messages.js
 * - ../auth.validation.js
 *
 * ============================================================
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/authApi.js';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { AuthAlert } from '../components/AuthAlert.jsx';
import { TextField } from '../components/AuthFields.jsx';
import { fieldErrorsFromApiError, technicalNoticeFor } from '../auth.messages.js';
import { INVALID_EMAIL_MESSAGE, REQUIRED_FIELD_MESSAGE, isValidEmail } from '../auth.validation.js';

/**
 * Solicita la recuperación de contraseña con confirmación neutra: el contrato responde igual
 * para correo existente, inexistente o con fallo de entrega, evitando enumerar cuentas.
 * @returns {import('react').ReactElement} Pantalla pública de recuperación de contraseña.
 */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [requestedEmail, setRequestedEmail] = useState('');

  /**
   * Envía la solicitud de recuperación al contrato y presenta el aviso neutro.
   * @param {import('react').FormEvent<HTMLFormElement>} event Evento de envío del formulario.
   * @returns {Promise<void>} Finaliza al aceptar la solicitud o al presentar el error.
   */
  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    const trimmedEmail = email.trim();
    let validationError;
    if (!trimmedEmail) {
      validationError = REQUIRED_FIELD_MESSAGE;
    } else if (!isValidEmail(trimmedEmail)) {
      validationError = INVALID_EMAIL_MESSAGE;
    }
    setFieldErrors(validationError ? {
      email: validationError
    } : {});
    if (validationError) {
      setNotice(null);
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      await authApi.forgotPassword(trimmedEmail.toLowerCase());
      setRequestedEmail(trimmedEmail.toLowerCase());
      setAccepted(true);
    } catch (caught) {
      const mappedErrors = fieldErrorsFromApiError(caught);
      if (Object.keys(mappedErrors).length > 0) {
        setFieldErrors(current => ({
          ...current,
          ...mappedErrors
        }));
      } else {
        setNotice(technicalNoticeFor(caught,
          'No se pudo procesar la solicitud. Intenta nuevamente.'));
      }
    } finally {
      setSubmitting(false);
    }
  }
  if (accepted) {
    return <AuthLayout>
        <h1 className="auth-title">Recuperar Contraseña</h1>
        <AuthAlert tone="success" title="Solicitud enviada con éxito">
          Si el correo <strong>{requestedEmail}</strong> se encuentra registrado en MATISTA,
          recibirás un enlace seguro para restablecer tu contraseña en breve.
        </AuthAlert>
        <p className="auth-lead">
          El enlace expira por motivos de protección; si no lo recibes, puedes solicitarlo nuevamente.
        </p>
        <div className="auth-actions">
          <Link className="auth-button" to="/login">Volver a iniciar sesión</Link>
        </div>
      </AuthLayout>;
  }
  return <AuthLayout>
      <h1 className="auth-title">Recuperar Contraseña</h1>
      <p className="auth-lead">
        Ingresa tu email y te enviaremos un enlace seguro para restablecer tu clave de acceso a MATISTA.
      </p>

      {notice ? <AuthAlert tone={notice.tone} title={notice.title}>
          {notice.message}
        </AuthAlert> : null}

      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <TextField id="forgot-email" type="email" label="Email" required autoComplete="email"
          placeholder="ejemplo@email.com" value={email} onValueChange={setEmail} error={fieldErrors.email} />
        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting ? 'Enviando...' : 'Enviar enlace'}
        </button>
      </form>

      <hr className="auth-divider" />
      <p className="auth-footer">
        <Link className="auth-link" to="/login">Volver a iniciar sesión</Link>
      </p>
    </AuthLayout>;
}
