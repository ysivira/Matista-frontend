export const REQUIRED_FIELD_MESSAGE = 'Este campo es obligatorio.'
export const INVALID_EMAIL_MESSAGE = 'Ingresa un correo electrónico válido.'
export const INVALID_LEGAJO_MESSAGE = 'El DNI o legajo debe contener entre 7 y 10 dígitos.'
export const INVALID_PASSWORD_CONFIRMATION_MESSAGE = 'Las contraseñas ingresadas no coinciden.'

/** Patrón básico de correo: el backend mantiene la autoridad y normaliza con trim/minúsculas. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Verifica el formato básico y la longitud del correo electrónico.
 * @param {string} value Valor digitado por la persona usuaria.
 * @returns {boolean} true cuando el valor puede ser aceptado por el backend.
 */
export function isValidEmail(value) {
  return value.length <= 255 && EMAIL_PATTERN.test(value)
}

/**
 * Verifica el DNI/legajo como cadena de 7 a 10 dígitos según el contrato AUTH.
 * @param {string} value Valor digitado por la persona usuaria.
 * @returns {boolean} true cuando el valor tiene el formato exigido por el backend.
 */
export function isValidLegajo(value) {
  return /^\d{7,10}$/.test(value)
}
