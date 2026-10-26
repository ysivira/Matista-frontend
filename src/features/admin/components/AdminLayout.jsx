import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '../../auth/hooks/useSession.js'
import { SESSION_STATUS } from '../../auth/context/SessionContext.js'
import { LoadingState } from '../../../shared/ui/LoadingState.jsx'
import { BrandLogo } from '../../../shared/ui/BrandLogo.jsx'
import { EncabezadoSuperior } from '../../../shared/ui/EncabezadoSuperior.jsx'
import { NAVEGACION_ADMIN, NAVEGACION_ASESOR } from '../../../shared/ui/navegacionModulos.js'
import { IconoNavegacion } from '../../../shared/ui/IconoNavegacion.jsx'
import { AdminAvatar } from './AdminAvatar.jsx'
import { inicialesDe } from './iniciales.js'
import { PerfilCuentaModal } from '../../perfil/components/PerfilCuentaModal.jsx'
import '../admin.css'
// Los avisos y campos AUTH reutilizados por el módulo comparten la hoja AUTH.
import '../../auth/components/auth.css'

/**
 * Estructura compartida ADMIN/ASESOR bajo la identidad Amethyst Prism Enterprise:
 * barra lateral oscura con el logo oficial y la tarjeta de cuenta operante,
 * topbar con Cerrar Sesión y lienzo oscuro con tarjetas claras. La tarjeta de
 * usuario abre el modal «Mi perfil» con las operaciones personales de AUTH.
 * Reutiliza la sesión AUTH vigente; no conserva ni administra credenciales
 * propias en el navegador.
 * @param {{children?: import('react').ReactNode, section?: string}} props Sección activa para el texto del encabezado.
 * @returns {import('react').ReactElement} Shell único con navegación comercial o administrativa.
 */
export function AdminLayout({ children, section = 'Módulo ADMIN' }) {
  const { status, user, logout, clearSession } = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const [perfilAbierto, setPerfilAbierto] = useState(false)
  const comercial = location.pathname.startsWith('/asesor')

  // El topbar refleja la pantalla activa; el prop conserva el default para usos aislados.
  const navegacion = comercial ? NAVEGACION_ASESOR : NAVEGACION_ADMIN
  const seccionActiva = navegacion.find(item => item.ruta === location.pathname)?.titulo ?? (location.pathname.startsWith('/asesor/cotizaciones/') ? 'Historial' : section)

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
      <aside className="admin-sidebar" aria-label={comercial ? 'Navegación del módulo ASESOR' : 'Navegación del módulo ADMIN'}>
        <div className="admin-brand">
          <BrandLogo surface="dark" compact />
        </div>

        <nav className="admin-nav">
          {navegacion.map(item => <NavLink key={item.ruta} to={item.ruta} end={item.ruta === '/admin' || item.ruta === '/asesor'}
            className={({ isActive }) => isActive ? 'admin-nav__link admin-nav__link--active' : 'admin-nav__link'}>
            <IconoNavegacion trazo={item.icono} /><span className="admin-nav__label">{item.titulo}</span>
          </NavLink>)}
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
        <EncabezadoSuperior
          seccion={seccionActiva}
          usuario={user}
          onCerrarSesion={() => void handleLogout()}
        />
        <main className="admin-content">
          {children ?? <Outlet />}
        </main>
      </div>

      {perfilAbierto ? <PerfilCuentaModal onClose={() => setPerfilAbierto(false)} /> : null}
    </div>
  )
}
