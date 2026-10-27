/**
 * MATISTA - Frontend · Composición de la aplicación
 * Archivo: AppProviders.jsx
 *
 * RESPONSABILIDAD:
 * Compone la aplicación: proveedores, enrutado y disposición general de la sesión.
 *
 * CONTENIDO:
 * - Función AppProviders.
 *
 * DEPENDENCIAS:
 * - ../features/auth/context/SessionProvider.jsx
 */
import { SessionProvider } from '../features/auth/context/SessionProvider.jsx';

/**
 * Agrupa los proveedores globales sin acoplarlos al componente raíz o al router.
 * @param {object} props Propiedades del componente.
 * @param {import('react').ReactNode} props.children Árbol de aplicación.
 * @returns {import('react').ReactElement} Proveedores globales de MATISTA.
 */
export function AppProviders({
  children
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
