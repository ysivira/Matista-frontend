/**
 * ============================================================
 * MATISTA | AVISOS TÉCNICOS DE API
 * ============================================================
 *
 * Archivo: avisosApi.js
 * Módulo: Utilidades compartidas
 *
 * Responsabilidad:
 * Presentar límites de solicitudes y fallos de transporte o API
 * con mensajes públicos, sin inventar tiempos de reintento.
 *
 * ============================================================
 */
import { ApiError, NetworkError } from './httpClient.js';

/**
 * Construye el aviso de límite de solicitudes confirmado por el backend.
 * @param {unknown} error Error capturado por una operación de API.
 * @returns {object|null} Aviso público para 429 RATE_LIMIT_EXCEEDED, o null si no corresponde.
 */
export function rateLimitNoticeFor(error) {
  if (!(error instanceof ApiError) || error.code !== 'RATE_LIMIT_EXCEEDED') {
    return null;
  }
  // El contrato no publica duración: no se inventan temporizadores ni reintentos automáticos.
  return {
    tone: 'warning',
    title: 'Demasiados intentos',
    message: error.message
  };
}

/**
 * Presenta errores técnicos de transporte o API con los mismos mensajes públicos existentes.
 * @param {unknown} error Error recibido del cliente HTTP.
 * @param {string} fallbackMessage Mensaje cuando el error no transmite texto público.
 * @returns {object} Aviso accesible sin trazas ni credenciales.
 */
export function technicalNoticeFor(error, fallbackMessage) {
  const rateLimitNotice = rateLimitNoticeFor(error);
  if (rateLimitNotice) {
    return rateLimitNotice;
  }
  if (error instanceof NetworkError) {
    return {
      tone: 'error',
      title: 'Sin conexión con la API',
      message: error.message
    };
  }
  return {
    tone: 'error',
    title: 'No se pudo completar la operación',
    message: error?.message || fallbackMessage
  };
}
