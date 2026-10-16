import { SessionProvider } from '../features/auth/context/SessionProvider.jsx'

/**
 * Agrupa los proveedores globales sin acoplarlos al componente raíz o al router.
 * @param {object} props Propiedades del componente.
 * @param {import('react').ReactNode} props.children Árbol de aplicación.
 * @returns {import('react').ReactElement} Proveedores globales de MATISTA.
 */
export function AppProviders({ children }) {
  return <SessionProvider>{children}</SessionProvider>
}
