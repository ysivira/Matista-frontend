/**
 * ============================================================
 * MATISTA | REGISTRO PÚBLICO DE ASESOR
 * ============================================================
 *
 * Archivo: RegisterPage.jsx
 * Módulo: Autenticación
 *
 * Responsabilidad:
 * Validar el formulario y solicitar el alta pública de una cuenta ASESOR pendiente.
 *
 * CONTENIDO:
 * - Función RegisterPage.
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
 * - ../../../shared/ui/MatistaLoadingModal.jsx
 *
 * ============================================================
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/authApi.js';
import { AuthLayout } from '../components/AuthLayout.jsx';
import { AuthAlert } from '../components/AuthAlert.jsx';
import { PasswordField, TextField } from '../components/AuthFields.jsx';
import { MatistaLoadingModal } from '../../../shared/ui/MatistaLoadingModal.jsx';
import { fieldErrorsFromApiError, technicalNoticeFor } from '../auth.messages.js';
import { INVALID_EMAIL_MESSAGE, INVALID_LEGAJO_MESSAGE, INVALID_PASSWORD_CONFIRMATION_MESSAGE,
  REQUIRED_FIELD_MESSAGE, isValidEmail, isValidLegajo } from '../auth.validation.js';

// Los campos coinciden con el DTO del contrato; passwordConfirmation es solo local
// y jamás se envía al backend: allí se aplican de nuevo las reglas de la contraseña.
const INITIAL_VALUES = {
  legajo: '',
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  direccion: '',
  password: '',
  passwordConfirmation: ''
};

/**
 * Registra un asesor con el DTO del contrato: legajo, nombre, apellido, email y password
 * obligatorios; telefono y direccion opcionales. No existe registro público de administradores.
 * @returns {import('react').ReactElement} Pantalla pública de registro de asesor.
 */
export function RegisterPage() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  /**
   * Actualiza un campo controlado sin normalizar la contraseña.
   * @param {keyof typeof INITIAL_VALUES} fieldName Nombre del campo del DTO.
   * @returns {(nextValue: string) => void} Actualizador parcial del estado.
   */
  function updateField(fieldName) {
    return nextValue => {
      setValues(current => ({
        ...current,
        [fieldName]: nextValue
      }));
    };
  }

  /**
   * Envía el registro con los campos opcionales omitidos cuando quedan vacíos.
   * @param {import('react').FormEvent<HTMLFormElement>} event Evento de envío del formulario.
   * @returns {Promise<void>} Finaliza al confirmar el registro o al presentar errores.
   */
  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    /** @type {Record<string, string>} */
    const errors = {};
    const trimmedLegajo = values.legajo.trim();
    if (!trimmedLegajo) {
      errors.legajo = REQUIRED_FIELD_MESSAGE;
    } else if (!isValidLegajo(trimmedLegajo)) {
      errors.legajo = INVALID_LEGAJO_MESSAGE;
    }
    if (!values.nombre.trim()) errors.nombre = REQUIRED_FIELD_MESSAGE;
    if (!values.apellido.trim()) errors.apellido = REQUIRED_FIELD_MESSAGE;
    const trimmedEmail = values.email.trim();
    if (!trimmedEmail) {
      errors.email = REQUIRED_FIELD_MESSAGE;
    } else if (!isValidEmail(trimmedEmail)) {
      errors.email = INVALID_EMAIL_MESSAGE;
    }
    if (!values.password) errors.password = REQUIRED_FIELD_MESSAGE;
    // Regla local de coincidencia; el backend no recibe este campo y mantiene su propia política.
    if (!values.passwordConfirmation) {
      errors.passwordConfirmation = REQUIRED_FIELD_MESSAGE;
    } else if (values.password !== values.passwordConfirmation) {
      errors.passwordConfirmation = INVALID_PASSWORD_CONFIRMATION_MESSAGE;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setNotice(null);
      return;
    }
    const payload = {
      legajo: trimmedLegajo,
      nombre: values.nombre.trim(),
      apellido: values.apellido.trim(),
      email: trimmedEmail.toLowerCase(),
      password: values.password
    };
    // Opcionales del contrato: se omiten por completo para no enviar cadenas vacías.
    const telefono = values.telefono.trim();
    const direccion = values.direccion.trim();
    if (telefono) payload.telefono = telefono;
    if (direccion) payload.direccion = direccion;
    setSubmitting(true);
    setNotice(null);
    try {
      const response = await authApi.register(payload);
      setRegisteredEmail(payload.email);
      setRegistered(true);
      if (response?.verificationDelivery === 'RETRY_REQUIRED') {
        // El backend no revierte la cuenta por fallo de envío: se informa y el usuario podrá
        // reenviar.
        setNotice({
          tone: 'warning',
          title: 'El correo de verificación no se envió en este momento',
          message:
            'Tu cuenta fue registrada, pero el envío del correo falló. Podrás solicitarlo nuevamente más tarde.'
        });
      }
    } catch (caught) {
      const mappedErrors = fieldErrorsFromApiError(caught);
      if (Object.keys(mappedErrors).length > 0) {
        setFieldErrors(current => ({
          ...current,
          ...mappedErrors
        }));
        setNotice({
          tone: 'error',
          title: 'Revisa los datos del formulario',
          message: caught.message || 'Algunos campos requieren tu atención.'
        });
      } else {
        setNotice(technicalNoticeFor(caught,
          'No se pudo registrar la cuenta. Intenta nuevamente.'));
      }
    } finally {
      setSubmitting(false);
    }
  }
  if (registered) {
    return <AuthLayout wide>
        <div className="auth-title-block">
          <h1 className="auth-title">Registro completado</h1>
          <span className="auth-badge">Nuevo colaborador</span>
        </div>
        <p className="auth-lead">Tu cuenta quedó creada y a la espera de los pasos de activación.</p>
        <AuthAlert tone={notice?.tone ?? 'success'}
          title={notice?.title ?? 'Verificación de correo requerida'}>
          <p>
            Enviamos instrucciones de verificación a <strong>{registeredEmail}</strong>. La verificación
            del correo no activa la cuenta automáticamente.
          </p>
          <p>Tras verificar tu correo, un administrador habilitará el ingreso de tu cuenta.</p>
          {notice?.message ? <p>{notice.message}</p> : null}
        </AuthAlert>
        <div className="auth-links">
          <Link className="auth-button" to="/login">Ir a iniciar sesión</Link>
          <Link className="auth-link"
            to="/resend-verification">No recibí el correo de verificación</Link>
        </div>
      </AuthLayout>;
  }
  return <AuthLayout wide>
      <MatistaLoadingModal abierto={submitting} titulo="Estamos creando tu cuenta"
        descripcion="Estamos procesando tu solicitud y preparando el correo de verificación. Por favor, esperá unos instantes." />
      <div className="auth-title-block">
        <h1 className="auth-title">Crear Cuenta</h1>
        <span className="auth-badge">Nuevo colaborador</span>
      </div>
      <p className="auth-lead">
        Completa tus datos personales y laborales para habilitar tu acceso al sistema.
      </p>

      {notice ? <AuthAlert tone={notice.tone} title={notice.title}>
          {notice.message}
        </AuthAlert> : null}

      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <TextField id="register-legajo" label="DNI / Legajo" required inputMode="numeric"
          maxLength={10} placeholder="Ingrese su DNI o N° de legajo" value={values.legajo}
          onValueChange={updateField('legajo')} error={fieldErrors.legajo} />
        <div className="auth-field-block auth-field-block--two">
          <TextField id="register-nombre" label="Nombre" required maxLength={100}
            placeholder="Ingrese su nombre" value={values.nombre} onValueChange={updateField('nombre')}
            error={fieldErrors.nombre} />
          <TextField id="register-apellido" label="Apellido" required maxLength={100}
            placeholder="Ingrese su apellido" value={values.apellido} onValueChange={updateField('apellido')}
            error={fieldErrors.apellido} />
        </div>
        <div className="auth-field-block auth-field-block--two">
          <TextField id="register-email" type="email" label="Email" required autoComplete="email"
            placeholder="nombre@empresa.com" value={values.email} onValueChange={updateField('email')}
            error={fieldErrors.email} />
          <TextField id="register-telefono" type="tel" label="Teléfono" inputMode="tel"
            maxLength={20} placeholder="+54 9 11 1234-5678" hint="Opcional" value={values.telefono}
            onValueChange={updateField('telefono')} error={fieldErrors.telefono} />
        </div>
        <TextField id="register-direccion" label="Dirección" maxLength={255}
          placeholder="Calle, N°, Piso / Depto, Ciudad" hint="Opcional" value={values.direccion}
          onValueChange={updateField('direccion')} error={fieldErrors.direccion} />
        <PasswordField id="register-password" label="Contraseña" required
          autoComplete="new-password" placeholder="Cree una contraseña segura"
          hint="La política vigente de contraseñas la aplica el servidor." value={values.password}
          onValueChange={updateField('password')} error={fieldErrors.password} />
        <PasswordField id="register-password-confirmation" label="Confirmar contraseña" required
          autoComplete="new-password" placeholder="Repetir la contraseña" value={values.passwordConfirmation}
          onValueChange={updateField('passwordConfirmation')} error={fieldErrors.passwordConfirmation} />
        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting ? 'Registrando...' : 'Registrarme'}
        </button>
      </form>

      <hr className="auth-divider" />
      <p className="auth-footer">
        ¿Ya tienes cuenta? <Link className="auth-link" to="/login">Inicia sesión</Link>
      </p>
    </AuthLayout>;
}
