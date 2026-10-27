/**
 * MATISTA - Frontend · Autenticación
 * Archivo: SessionContext.js
 *
 * RESPONSABILIDAD:
 * Contexto SessionContext del módulo Autenticación; comparte estado de sesión entre componentes.
 *
 * CONTENIDO:
 * - Constante SESSION_STATUS.
 * - Constante SessionContext.
 *
 * DEPENDENCIAS:
 * - react
 */
import { createContext } from 'react';
export const SESSION_STATUS = Object.freeze({
  CHECKING: 'checking',
  AUTHENTICATED: 'authenticated',
  ANONYMOUS: 'anonymous',
  ERROR: 'error'
});
export const SessionContext = createContext(null);
