/**
 * MATISTA - Frontend · Composición de la aplicación
 * Archivo: SessionLayout.jsx
 *
 * RESPONSABILIDAD:
 * Compone la aplicación: proveedores, enrutado y disposición general de la sesión.
 *
 * CONTENIDO:
 * - Función SessionLayout.
 *
 * DEPENDENCIAS:
 * - react
 * - react-router-dom
 * - ../features/auth/hooks/useSession.js
 * - ../features/auth/context/SessionContext.js
 * - ../features/perfil/components/PerfilCuentaModal.jsx
 * - ../shared/layouts/AppLayout.jsx
 * - ../shared/ui/LoadingState.jsx
 * - ../features/admin/admin.css
 * - ../features/auth/components/auth.css
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../features/auth/hooks/useSession.js';
import { SESSION_STATUS } from '../features/auth/context/SessionContext.js';
import { PerfilCuentaModal } from '../features/perfil/components/PerfilCuentaModal.jsx';
import { AppLayout } from '../shared/layouts/AppLayout.jsx';
import { LoadingState } from '../shared/ui/LoadingState.jsx';
// Se conservan las hojas y clases existentes; no se modifica su contenido ni el CSS documental
// local.
import '../features/admin/admin.css';
import '../features/auth/components/auth.css';

/**
 * Compone el shell neutral con la sesión y las operaciones personales, sin conectar funcionalidades
 * entre sí.
 * @param {{children?: import('react').ReactNode, section?: string}} props Contenido y sección del
 * shell existente.
 * @returns {import('react').ReactElement} Estado de carga o shell con el mismo modal de cuenta.
 */
export function SessionLayout({
  children,
  section = 'Módulo ADMIN'
}) {
  const {
    status,
    user,
    logout,
    clearSession
  } = useSession();
  const navigate = useNavigate();
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  if (status !== SESSION_STATUS.AUTHENTICATED || !user) {
    return <LoadingState message="Verificando tu sesión..." />;
  }

  /**
   * Conserva el cierre AUTH y su recuperación local antes de navegar al login.
   * @returns {Promise<void>} Finaliza tras cerrar la sesión o limpiar el estado si el transporte
   * falla.
   */
  async function handleLogout() {
    try {
      await logout();
    } catch {
      clearSession();
    }
    navigate('/login', {
      replace: true
    });
  }
  return <AppLayout
    user={user}
    section={section}
    onLogout={() => void handleLogout()}
    onOpenProfile={() => setPerfilAbierto(true)}
    cuenta={perfilAbierto
      ? <PerfilCuentaModal onClose={() => setPerfilAbierto(false)} />
      : null}
  >
    {children}
  </AppLayout>;
}
