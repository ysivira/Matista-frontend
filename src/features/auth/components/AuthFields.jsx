/**
 * MATISTA - Frontend · Autenticación
 * Archivo: AuthFields.jsx
 *
 * RESPONSABILIDAD:
 * Componente AuthFields del módulo Autenticación; unidad de interfaz reutilizable de la feature.
 *
 * CONTENIDO:
 * - Función TextField.
 * - Función PasswordField.
 *
 * DEPENDENCIAS:
 * - react
 */
import { useState } from 'react';

/**
 * Campo de texto con etiqueta, pistas y errores accesibles para los formularios públicos AUTH.
 * @param {object} props Propiedades del campo.
 * @param {string} props.id Identificador compartido por input, etiqueta y mensajes.
 * @param {string} props.label Etiqueta visible del campo.
 * @param {'text'|'email'|'tel'} [props.type] Tipo de input.
 * @param {string} props.value Valor controlado.
 * @param {(nextValue: string) => void} props.onValueChange Notifica el nuevo valor.
 * @param {string} [props.error] Mensaje de error del campo; reemplaza la pista.
 * @param {string} [props.hint] Texto de ayuda presentado cuando no hay error.
 * @param {boolean} [props.required] Marca el campo como obligatorio para el asistente.
 * @param {string} [props.autoComplete] Sugerencia de autocompletado del navegador.
 * @param {string} [props.placeholder] Texto guía del input.
 * @param {'numeric'} [props.inputMode] Teclado preferido en dispositivos móviles.
 * @param {number} [props.maxLength] Límite de caracteres admitido por el contrato.
 * @returns {import('react').ReactElement} Campo accesible con asociación label/input/error.
 */
export function TextField({
  id,
  label,
  type = 'text',
  value,
  onValueChange,
  error,
  hint,
  required = false,
  autoComplete,
  placeholder,
  inputMode,
  maxLength
}) {
  const describedByIds = [
    error ? `${id}-error` : null,
    !error && hint ? `${id}-hint` : null
  ].filter(Boolean);
  return <div className="auth-field">
      <label className="auth-label" htmlFor={id}>
        {label}
        {required ? <span className="auth-label__required" aria-hidden="true">*</span> : null}
      </label>
      <input
        id={id}
        name={id}
        className={error ? 'auth-input auth-input--invalid' : 'auth-input'}
        type={type}
        value={value}
        onChange={event => onValueChange(event.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedByIds.length > 0 ? describedByIds.join(' ') : undefined}
      />
      {error ? <p className="auth-field-error" id={`${id}-error`}>{error}</p> : hint
        ? <p className="auth-hint" id={`${id}-hint`}>{hint}</p> : null}
    </div>;
}

/**
 * Campo de contraseña con alternancia accesible de visibilidad sin conservar el valor.
 * @param {object} props Propiedades del campo.
 * @param {string} props.id Identificador compartido por input, etiqueta y mensajes.
 * @param {string} props.label Etiqueta visible del campo.
 * @param {string} props.value Valor controlado (no se recorta ni normaliza).
 * @param {(nextValue: string) => void} props.onValueChange Notifica el nuevo valor.
 * @param {string} [props.error] Mensaje de error del campo.
 * @param {string} [props.hint] Texto de ayuda presentado cuando no hay error.
 * @param {boolean} [props.required] Marca el campo como obligatorio para el asistente.
 * @param {string} [props.autoComplete] Sugerencia de autocompletado del navegador.
 * @param {string} [props.placeholder] Texto guía del input.
 * @returns {import('react').ReactElement} Campo de contraseña con control de visibilidad.
 */
export function PasswordField({
  id,
  label,
  value,
  onValueChange,
  error,
  hint,
  required = false,
  autoComplete,
  placeholder
}) {
  const [visible, setVisible] = useState(false);
  const describedByIds = [
    error ? `${id}-error` : null,
    !error && hint ? `${id}-hint` : null
  ].filter(Boolean);
  return <div className="auth-field">
      <label className="auth-label" htmlFor={id}>
        {label}
        {required ? <span className="auth-label__required" aria-hidden="true">*</span> : null}
      </label>
      <div className="auth-input-wrap">
        <input id={id} name={id} className={`auth-input auth-input--with-toggle${error
          ? ' auth-input--invalid' : ''}`}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={event => onValueChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedByIds.length > 0 ? describedByIds.join(' ') : undefined}
        />
        <button className="auth-input-toggle" type="button"
          onClick={() => setVisible(current => !current)} aria-pressed={visible} aria-label={visible
          ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}>
          {visible ? 'Ocultar' : 'Ver'}
        </button>
      </div>
      {error ? <p className="auth-field-error" id={`${id}-error`}>{error}</p> : hint
        ? <p className="auth-hint" id={`${id}-hint`}>{hint}</p> : null}
    </div>;
}
