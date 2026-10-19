import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useSession } from '../../auth/hooks/useSession.js'
import { SESSION_STATUS } from '../../auth/context/SessionContext.js'
import { LoadingState } from '../../../shared/ui/LoadingState.jsx'
import { BrandLogo } from '../../../shared/ui/BrandLogo.jsx'
import { AdminAvatar } from './AdminAvatar.jsx'
import { inicialesDe } from './iniciales.js'
import { PerfilCuentaModal } from '../../perfil/components/PerfilCuentaModal.jsx'
import '../admin.css'
// Los avisos y campos AUTH reutilizados por el módulo comparten la hoja AUTH.
import '../../auth/components/auth.css'

/** Ícono de la única entrada de navegación del módulo (trazo de Stitch). */
const ICONO_DIRECTORIO = 'M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM1 18v-1a6 6 0 0 1 14 0v1M17 7a3 3 0 1 0-1-5.9M21 18v-1a6 6 0 0 0-3.5-5.4'

/**
 * Estructura del módulo ADMIN bajo la identidad Amethyst Prism Enterprise:
 * barra lateral oscura con el logo oficial y la tarjeta de cuenta operante,
 * topbar con Cerrar Sesión y lienzo oscuro con tarjetas claras. La tarjeta de
 * usuario abre el modal «Mi perfil» con las operaciones personales de AUTH.
 * Reutiliza la sesión AUTH vigente; no conserva ni administra credenciales
 * propias en el navegador.
 * @param {{children?: import('react').ReactNode, section?: string}} props Sección activa para el texto del encabezado.
 * @returns {import('react').ReactElement} Shell de navegación del módulo ADMIN.
 */
export function AdminLayout({ children, section = 'Módulo ADMIN' }) {
  const { status, user, logout, clearSession } = useSession()
  const navigate = useNavigate()
  const [perfilAbierto, setPerfilAbierto] = useState(false)

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
          <BrandLogo surface="dark" compact />
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" className={({ isActive }) => (isActive ? 'admin-nav__link admin-nav__link--active' : 'admin-nav__link')}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={ICONO_DIRECTORIO} />
            </svg>
            Gestión de empleados
          </NavLink>
        </nav>

        <div className="admin-sidebar__footer">
          <button className="admin-user" type="button" aria-label="Mi perfil" onClick={() => setPerfilAbierto(true)}>
            <AdminAvatar iniciales={inicialesDe(user)} />
            <span className="admin-user__text">
              <span className="admin-user__name">{[user.nombre, user.apellido].filter(Boolean).join(' ') || '—'}</span>
              <span className="admin-user__role">{user.rol}</span>
            </span>
          </button>
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

      {perfilAbierto ? <PerfilCuentaModal onClose={() => setPerfilAbierto(false)} /> : null}
    </div>
  )
}
