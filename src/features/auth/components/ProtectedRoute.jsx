/**
 * MATISTA - Frontend · Autenticación
 * Archivo: ProtectedRoute.jsx
 *
 * RESPONSABILIDAD:
 * Componente ProtectedRoute del módulo Autenticación; unidad de interfaz reutilizable de la
 * feature.
 *
 * CONTENIDO:
 * - Función ProtectedRoute.
 *
 * DEPENDENCIAS:
 * - react-router-dom
 * - ../../../shared/ui/LoadingState.jsx
 * - ../auth.constants.js
 * - ../context/SessionContext.js
 * - ../hooks/useSession.js
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '../../../shared/ui/LoadingState.jsx';
import { ACTIVE_ACCOUNT_STATUS } from '../auth.constants.js';
import { SESSION_STATUS } from '../context/SessionContext.js';
import { useSession } from '../hooks/useSession.js';

/**
 * Protege navegación por sesión, estado activo y rol sin sustituir la autorización del backend.
 * @param {object} props Propiedades del guard.
 * @param {string[]} [props.allowedRoles] Roles que pueden presentar las rutas hijas.
 * @returns {import('react').ReactElement} Carga, redirección o ruta hija autorizada.
 */
export function ProtectedRoute({
  allowedRoles = []
}) {
  const {
    status,
    user,
    refreshSession
  } = useSession();
  const location = useLocation();
  if (status === SESSION_STATUS.CHECKING) {
    return <main className="infrastructure-shell">
        <section className="infrastructure-card">
          <LoadingState message="Verificando sesión..." />
        </section>
      </main>;
  }
  if (status === SESSION_STATUS.ERROR) {
    return <main className="infrastructure-shell">
        <section className="infrastructure-card" role="alert">
          <h1>No se pudo verificar la sesión</h1>
          <p>Compruebe la conexión e intente nuevamente.</p>
          <div className="infrastructure-links">
            <button
              className="infrastructure-button"
              type="button"
              onClick={() => void refreshSession()}
            >
              Reintentar
            </button>
          </div>
        </section>
      </main>;
  }
  if (status !== SESSION_STATUS.AUTHENTICATED || !user) {
    return <Navigate
      to="/login"
      replace
      state={{
        from: location.pathname
      }}
    />;
  }
  if (user.estado !== ACTIVE_ACCOUNT_STATUS) {
    return <Navigate to="/account-unavailable" replace />;
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/access-denied" replace />;
  }
  return <Outlet />;
}
