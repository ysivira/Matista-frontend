/**
 * Shell compartido con navegación por módulo y acceso a la cuenta.
 */
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BrandLogo } from '../ui/BrandLogo.jsx';
import { EncabezadoSuperior } from '../ui/EncabezadoSuperior.jsx';
import { NAVEGACION_ADMIN, NAVEGACION_ASESOR } from '../ui/navegacionModulos.js';
import { IconoNavegacion } from '../ui/IconoNavegacion.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { inicialesDe } from '../lib/iniciales.js';

/**
 * Estructura compartida ADMIN/ASESOR bajo la identidad Amethyst Prism Enterprise:
 * barra lateral oscura con el logo oficial y la tarjeta de cuenta operante,
 * topbar con Cerrar Sesión y lienzo oscuro con tarjetas claras. La tarjeta de
 * usuario delega la apertura de cuenta en la composición de aplicación.
 * No conoce APIs, sesión AUTH ni la implementación del modal de PERFIL.
 * @param {{user: object, onLogout: Function, onOpenProfile: Function, cuenta?:
 * import('react').ReactNode, children?: import('react').ReactNode, section?: string}} props
 * Identidad pública, acciones y contenido compuesto.
 * @returns {import('react').ReactElement} Shell único con navegación comercial o administrativa.
 */
export function AppLayout({
  user,
  onLogout,
  onOpenProfile,
  cuenta,
  children,
  section = 'Módulo ADMIN'
}) {
  const location = useLocation();
  const comercial = location.pathname.startsWith('/asesor');

  // El topbar refleja la pantalla activa; el prop conserva el default para usos aislados.
  const navegacion = comercial ? NAVEGACION_ASESOR : NAVEGACION_ADMIN;
  const seccionActiva = navegacion.find(item => item.ruta === location.pathname)?.titulo
    ?? (location.pathname.startsWith('/asesor/cotizaciones/') ? 'Historial' : section);
  return <div className="admin-shell">
      <aside className="admin-sidebar" aria-label={comercial ? 'Navegación del módulo ASESOR' :
        'Navegación del módulo ADMIN'}>
        <div className="admin-brand">
          <BrandLogo surface="dark" compact />
        </div>

        <nav className="admin-nav">
          {navegacion.map(item => <NavLink key={item.ruta} to={item.ruta}
            end={item.ruta === '/admin' || item.ruta === '/asesor'} className={({
              isActive
            }) => isActive ? 'admin-nav__link admin-nav__link--active' : 'admin-nav__link'}>
            <IconoNavegacion trazo={item.icono} /><span className="admin-nav__label">{item.titulo}</span>
          </NavLink>)}
        </nav>

        <div className="admin-sidebar__footer">
          <button className="admin-user" type="button" aria-label="Mi perfil"
            onClick={onOpenProfile}>
            <Avatar iniciales={inicialesDe(user)} />
            <span className="admin-user__text">
              <span className="admin-user__name">{[user.nombre,
                user.apellido].filter(Boolean).join(' ') || '—'}</span>
              <span className="admin-user__role">{user.rol}</span>
            </span>
          </button>
        </div>
      </aside>

      <div className="admin-canvas">
        <EncabezadoSuperior seccion={seccionActiva} usuario={user} onCerrarSesion={onLogout} />
        <main className="admin-content">
          {children ?? <Outlet />}
        </main>
      </div>

      {cuenta}
    </div>;
}
