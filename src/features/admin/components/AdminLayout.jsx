import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useSession } from '../../auth/hooks/useSession.js'
import { SESSION_STATUS } from '../../auth/context/SessionContext.js'
import { LoadingState } from '../../../shared/ui/LoadingState.jsx'
import '../admin.css'

/**
 * Estructura del módulo definitivo de ADMIN inspirada en el diseño Stitch
 * aprobado: barra lateral oscura, encabezado con la cuenta operante y zona de
 * contenido. Reutiliza la sesión AUTH vigente; no conserva ni administra
 * credenciales propias en el navegador.
 * @param {{children?: import('react').ReactNode, section?: string}} props Sección activa para el texto del encabezado.
 * @returns {import('react').ReactElement} Shell de navegación del módulo ADMIN.
 */
export function AdminLayout({ children, section = 'Módulo ADMIN' }) {
  const { status, user, logout, clearSession } = useSession()
  const navigate = useNavigate()

  if (status !== SESSION_STATUS.AUTHENTICATED || !user) {
    // El guard de rutas ya resolvió la sesión; solo se espera sin navegar.
    return <LoadingState message="Verificando tu sesión..." />
  }

  /**
   * Cierra la sesión con el mecanismo de AUTH y resuelve la navegación al login.
   * @returns {Promise<void>} Finaliza tras el 204 idempotente o el aviso técnico.
   */
  async function handleLogout() {
    try {
      await logout()
    } catch {
      // Logout es idempotente; si falla el transporte, la sesión local no pierde el estado.
      clearSession()
    }
    navigate('/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Navegación del módulo ADMIN">
        <div className="admin-brand">
          <span className="admin-brand__mark" aria-hidden="true">M</span>
          <div className="admin-brand__text">
            <strong>MATISTA</strong>
            <span>Plataforma interna</span>
          </div>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" className={({ isActive }) => (isActive ? 'admin-nav__link admin-nav__link--active' : 'admin-nav__link')}>
            <span aria-hidden="true">▣</span>
            Directorio de empleados
          </NavLink>
          <NavLink to="/perfil" className={({ isActive }) => (isActive ? 'admin-nav__link admin-nav__link--active' : 'admin-nav__link')}>
            <span aria-hidden="true">◍</span>
            Mi perfil
          </NavLink>
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-user">
            <span className="admin-user__name">{[user.nombre, user.apellido].filter(Boolean).join(' ') || '—'}</span>
            <span className="admin-user__role">{user.rol}</span>
          </div>
          <button className="admin-button admin-button--ghost" type="button" onClick={() => void handleLogout()}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="admin-canvas">
        <header className="admin-topbar">
          <p className="admin-topbar__section">{section}</p>
          <p className="admin-topbar__meta">Sesión verificada por el servidor en cada acceso</p>
        </header>
        <main className="admin-content">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  )
}
