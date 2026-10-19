import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useSession } from '../../auth/hooks/useSession.js'
import { SESSION_STATUS } from '../../auth/context/SessionContext.js'
import { LoadingState } from '../../../shared/ui/LoadingState.jsx'
import { AdminAvatar, inicialesDe } from './AdminAvatar.jsx'
import '../admin.css'
// Los aviso y campos AUTH reutilizados por el módulo comparten la hoja AUTH.
import '../../auth/components/auth.css'

/** Íconos de navegación del diseño Stitch (trazos sencillos, heredan el color). */
const ICONOS_NAV = {
  directorio: 'M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM1 18v-1a6 6 0 0 1 14 0v1M17 7a3 3 0 1 0-1-5.9M21 18v-1a6 6 0 0 0-3.5-5.4',
  perfil: 'M11 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 20v-1a7 7 0 0 1 16 0v1',
}

/**
 * Estructura del módulo ADMIN bajo la identidad Amethyst Prism Enterprise:
 * barra lateral oscura con marca y cuenta operante, topbar con Cerrar Sesión
 * y lienzo oscuro con tarjetas claras. Reutiliza la sesión AUTH vigente; no
 * conserva ni administra credenciales propias en el navegador.
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

  const claseNav = (activa) => (activa ? 'admin-nav__link admin-nav__link--active' : 'admin-nav__link')

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Navegación del módulo ADMIN">
        <div className="admin-brand">
          <span className="admin-brand__logo" aria-hidden="true">M</span>
          <span className="admin-brand__name">MATISTA</span>
          <span className="admin-brand__caption">Gestión Comercial</span>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" className={({ isActive }) => claseNav(isActive)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={ICONOS_NAV.directorio} />
            </svg>
            Gestión de empleados
          </NavLink>
          <NavLink to="/perfil" className={({ isActive }) => claseNav(isActive)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={ICONOS_NAV.perfil} />
            </svg>
            Mi perfil
          </NavLink>
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-user">
            <AdminAvatar iniciales={inicialesDe(user)} />
            <div>
              <span className="admin-user__name">{[user.nombre, user.apellido].filter(Boolean).join(' ') || '—'}</span>
              <span className="admin-user__role">{user.rol}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="admin-canvas">
        <header className="admin-topbar">
          <div>
            <p className="admin-topbar__section">{section}</p>
            <p className="admin-topbar__meta">Sesión verificada por el servidor en cada acceso</p>
          </div>
          <button className="admin-logout" type="button" onClick={() => void handleLogout()}>
            Cerrar sesión
          </button>
        </header>
        <main className="admin-content">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  )
}
