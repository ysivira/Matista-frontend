import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
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
/** Ícono de la entrada "Planes": diamante de catálogo (trazo de Stitch). */
const ICONO_PLANES = 'M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l3 6 3-6M12 21L9 9M12 21l3-12'
/** Ícono de la entrada "Gestión de Precios": tarjeta de cobros (trazo de Stitch). */
const ICONO_PRECIOS = 'M2 6h20v12H2zM2 11h20M6 15h4'
/** Ícono de la entrada "Versiones": línea de tiempo con nodos (trazo de Stitch). */
const ICONO_VERSIONES = 'M3 5h18M3 12h12M3 19h6M18 16v5M15 18h6'

/** Encabezado del topbar por ruta activa del módulo ADMIN (SL-2). */
const SECCIONES_RUTA = Object.freeze({
  '/admin': 'Gestión de empleados',
  '/admin/planes': 'Planes',
  '/admin/tarifario': 'Gestión de Precios',
  '/admin/versiones': 'Versiones del tarifario',
})

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
  const location = useLocation()
  const navigate = useNavigate()
  const [perfilAbierto, setPerfilAbierto] = useState(false)

  // El topbar refleja la pantalla activa; el prop conserva el default para usos aislados.
  const seccionActiva = SECCIONES_RUTA[location.pathname] ?? section

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
          <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'admin-nav__link admin-nav__link--active' : 'admin-nav__link')}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={ICONO_DIRECTORIO} />
            </svg>
            Gestión de empleados
          </NavLink>
          <NavLink to="/admin/planes" className={({ isActive }) => (isActive ? 'admin-nav__link admin-nav__link--active' : 'admin-nav__link')}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={ICONO_PLANES} />
            </svg>
            Planes
          </NavLink>
          <NavLink to="/admin/tarifario" className={({ isActive }) => (isActive ? 'admin-nav__link admin-nav__link--active' : 'admin-nav__link')}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={ICONO_PRECIOS} />
            </svg>
            Gestión de Precios
          </NavLink>
          <NavLink to="/admin/versiones" className={({ isActive }) => (isActive ? 'admin-nav__link admin-nav__link--active' : 'admin-nav__link')}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={ICONO_VERSIONES} />
            </svg>
            Versiones
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
          <h1 className="admin-topbar__section">{seccionActiva}</h1>
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
