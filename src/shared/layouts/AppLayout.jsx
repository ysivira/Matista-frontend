/**
 * ============================================================
 * MATISTA | SHELL DE MÓDULOS
 * ============================================================
 *
 * Archivo: AppLayout.jsx
 * Módulo: Disposición compartida
 *
 * Responsabilidad:
 * Componer navegación, encabezado y contenido con identidad y
 * acciones recibidas, sin conocer APIs ni implementar sesión AUTH.
 *
 * ============================================================
 */
import { useEffect, useRef, useState } from 'react';
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
  // Menú lateral móvil: por debajo de 900 px el sidebar pasa a drawer; en
  // escritorio el estado no altera la composición (el overlay solo se
  // renderiza en móvil y el reajuste cruza el breakpoint lo cierra).
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [ubicacionMenu, setUbicacionMenu] = useState(location);
  const sidebar = useRef(null);
  // Toda transición del router (incluidos Atrás/Adelante, query y hash)
  // invalida la apertura anterior, sin esperar a un efecto ni permitir
  // que se reactive al volver a una entrada del historial.
  if (ubicacionMenu !== location) {
    setUbicacionMenu(location);
    if (menuAbierto) setMenuAbierto(false);
  }
  const [esPantallaAngosta, setEsPantallaAngosta] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 900px)').matches
  );
  const comercial = location.pathname.startsWith('/asesor');

  // El drawer solo existe en pantallas angostas: al cruzar el breakpoint hacia
  // escritorio se cierra (reacción del listener, sin setState en el efecto),
  // de modo que nunca queda un velo sobre el escritorio.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const consulta = window.matchMedia('(max-width: 900px)');
    const reaccionar = evento => {
      setEsPantallaAngosta(evento.matches);
      if (!evento.matches) setMenuAbierto(false);
    };
    consulta.addEventListener('change', reaccionar);
    return () => consulta.removeEventListener('change', reaccionar);
  }, []);

  // Con el drawer abierto se bloquea el desplazamiento del documento y se
  // permite el cierre con Escape; al cerrar se devuelven ambos estados.
  const drawerAbierto = menuAbierto && esPantallaAngosta && ubicacionMenu === location;
  useEffect(() => {
    if (!drawerAbierto) return undefined;
    const escapar = evento => {
      if (evento.key === 'Escape') setMenuAbierto(false);
    };
    const desplazamientoPrevio = document.body.style.overflow;
    const panel = sidebar.current;
    const hamburguesa = panel?.parentElement.querySelector('.ui-cabecera__menu');
    document.body.style.overflow = 'hidden';
    panel?.querySelector('.admin-sidebar__cerrar')?.focus({ preventScroll: true });
    document.addEventListener('keydown', escapar);
    return () => {
      document.body.style.overflow = desplazamientoPrevio;
      document.removeEventListener('keydown', escapar);
      // No robar foco a la página/modal de destino si ya lo gestionó.
      if (panel?.contains(document.activeElement) || document.activeElement === document.body) {
        hamburguesa?.focus({ preventScroll: true });
      }
    };
  }, [drawerAbierto]);

  // El topbar refleja la pantalla activa; el prop conserva el default para usos aislados.
  const navegacion = comercial ? NAVEGACION_ASESOR : NAVEGACION_ADMIN;
  const seccionActiva = navegacion.find(item => item.ruta === location.pathname)?.titulo
    ?? (location.pathname.startsWith('/asesor/cotizaciones/') ? 'Historial' : section);
  return <div className="admin-shell">
      <aside ref={sidebar} id="admin-nav-drawer" aria-label={comercial ? 'Navegación del módulo ASESOR' :
        'Navegación del módulo ADMIN'}
        className={`admin-sidebar${drawerAbierto ? ' admin-sidebar--abierto' : ''}`}>
        <button className="admin-sidebar__cerrar" type="button" aria-label="Cerrar menú"
          onClick={() => setMenuAbierto(false)}>✕</button>
        <div className="admin-brand">
          <BrandLogo surface="dark" compact />
        </div>

        <nav className="admin-nav">
          {navegacion.map(item => <NavLink key={item.ruta} to={item.ruta}
            end={item.ruta === '/admin' || item.ruta === '/asesor'} onClick={() => setMenuAbierto(false)}
            className={({              isActive
            }) => isActive ? 'admin-nav__link admin-nav__link--active' : 'admin-nav__link'}>
            <IconoNavegacion trazo={item.icono} /><span className="admin-nav__label">{item.titulo}</span>
          </NavLink>)}
        </nav>

        <div className="admin-sidebar__footer">
          <button className="admin-user" type="button" aria-label="Mi perfil"
            onClick={() => {
              setMenuAbierto(false);
              onOpenProfile?.();
            }}>
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
        <EncabezadoSuperior seccion={seccionActiva} usuario={user} onCerrarSesion={onLogout}
          menuControl={esPantallaAngosta
            ? { abierto: drawerAbierto, alternar: () => setMenuAbierto(a => !a), destino: 'admin-nav-drawer' }
            : null} />
        <main className="admin-content">
          {children ?? <Outlet />}
        </main>
      </div>

      {drawerAbierto
        ? <div className="admin-velo" role="presentation" aria-hidden="true"
            onClick={() => setMenuAbierto(false)} /> : null}
      {cuenta}
    </div>;
}
