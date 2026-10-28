/**
 * ============================================================
 * MATISTA | CONTEXTO DE SESIÓN
 * ============================================================
 *
 * Archivo: SessionContext.js
 * Módulo: Autenticación
 *
 * Responsabilidad:
 * Declarar el contexto React y los estados públicos de la sesión en memoria.
 *
 * CONTENIDO:
 * - Constante SESSION_STATUS.
 * - Constante SessionContext.
 *
 * DEPENDENCIAS:
 * - react
 *
 * ============================================================
 */
import { createContext } from 'react';
export const SESSION_STATUS = Object.freeze({
  CHECKING: 'checking',
  AUTHENTICATED: 'authenticated',
  ANONYMOUS: 'anonymous',
  ERROR: 'error'
});
export const SessionContext = createContext(null);
