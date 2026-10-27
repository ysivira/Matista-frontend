/**
 * MATISTA - Frontend · Autenticación
 * Archivo: useSession.js
 *
 * RESPONSABILIDAD:
 * Hook reutilizable de la interfaz.
 *
 * CONTENIDO:
 * - Función useSession.
 *
 * DEPENDENCIAS:
 * - react
 * - ../context/SessionContext.js
 */
import { useContext } from 'react';
import { SessionContext } from '../context/SessionContext.js';

/**
 * Expone la sesión centralizada y evita consumirla fuera de AppProviders.
 * @returns {object} Estado y operaciones de sesión.
 * @throws {Error} Cuando el hook se usa fuera de SessionProvider.
 */
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession debe utilizarse dentro de SessionProvider.');
  return session;
}
