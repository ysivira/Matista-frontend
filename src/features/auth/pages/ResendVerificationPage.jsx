/**
 * ============================================================
 * MATISTA | REENVÍO DE VERIFICACIÓN
 * ============================================================
 *
 * Archivo: ResendVerificationPage.jsx
 * Módulo: Autenticación
 *
 * Responsabilidad:
 * Solicitar otro enlace de verificación sin revelar elegibilidad o existencia de cuentas.
 *
 * CONTENIDO:
 * - Función ResendVerificationPage.
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
import { MatistaLoadingModal } from '../../../shared/ui/MatistaLoadingModal.jsx';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { AuthAlert } from '../components/AuthAlert.jsx';
import { TextField } from '../components/AuthFields.jsx';
import { fieldErrorsFromApiError, technicalNoticeFor } from '../auth.messages.js';
import { INVALID_EMAIL_MESSAGE, REQUIRED_FIELD_MESSAGE, isValidEmail } from '../auth.validation.js';

/**
 * Solicita de forma neutral un nuevo correo de verificación para una cuenta pendiente.
 * El contrato mantiene el mismo cuerpo para correo inexistente, no elegible o fallo de entrega:
 * la confirmación nunca revela la existencia de cuentas.
 * @returns {import('react').ReactElement} Pantalla pública de reenvío de verificación.
 */
export function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  /**
   * Envía la solicitud de reenvío al contrato y presenta una confirmación neutra.
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
      await authApi.resendVerification(trimmedEmail.toLowerCase());
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
        <h1 className="auth-title">Reenviar verificación</h1>
        <AuthAlert tone="success" title="Solicitud recibida">
          Si el correo corresponde a una cuenta con verificación pendiente, te enviaremos un
          nuevo enlace en breve. Revisa también tu carpeta de correo no deseado.
        </AuthAlert>
        <div className="auth-actions">
          <Link className="auth-button" to="/login">Volver a iniciar sesión</Link>
        </div>
      </AuthLayout>;
  }
  return <AuthLayout>
      <MatistaLoadingModal abierto={submitting} titulo="Reenviando correo de verificación"
        descripcion="Enviando el enlace de confirmación. Espera unos instantes." />
      <h1 className="auth-title">Reenviar verificación</h1>
      <p className="auth-lead">
        Solicita un nuevo correo de verificación para tu cuenta de MATISTA.
      </p>

      {notice ? <AuthAlert tone={notice.tone} title={notice.title}>
          {notice.message}
        </AuthAlert> : null}

      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <TextField id="resend-email" type="email" label="Email" required autoComplete="email"
          placeholder="ejemplo@email.com" value={email} onValueChange={setEmail} error={fieldErrors.email} />
        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting ? 'Enviando...' : 'Reenviar correo de confirmación'}
        </button>
      </form>

      <hr className="auth-divider" />
      <p className="auth-footer">
        <Link className="auth-link" to="/login">Volver a iniciar sesión</Link>
      </p>
    </AuthLayout>;
}
