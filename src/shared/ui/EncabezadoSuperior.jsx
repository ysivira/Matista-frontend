/**
 * ============================================================
 * MATISTA | ENCABEZADO SUPERIOR
 * ============================================================
 *
 * Archivo: EncabezadoSuperior.jsx
 * Módulo: Interfaz compartida
 *
 * Responsabilidad:
 * Presentar sección, identidad y cierre de sesión junto al
 * control opcional del menú lateral en pantallas angostas.
 *
 * ============================================================
 */
import { BrandLogo } from './BrandLogo.jsx';
import './uiCompartidos.css';

/**
 * Encabezado superior del shell de los módulos ADMIN y ASESOR, adaptado del
 * diseño de Stitch aprobado: a la izquierda el nombre de la sección activa y
 * a la derecha la identidad de la sesión (isotipo de MATISTA, nombre y rol)
 * seguida del botón de salida con el icono de cierre. Los datos provienen
 * siempre del estado de autenticación; el componente no decide permisos: cada
 * módulo decide si muestra y qué ejecuta al cerrar sesión.
 */

/** Trazo del icono de salida (símbolo «logout» del diseño aprobado). */
const ICONO_SALIDA = 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9';

/**
 * Encabezado superior compartido con la identidad de la sesión.
 * @param {{seccion?: string, usuario?: object|null, onCerrarSesion?: () => void,
 *   menuControl?: ?{abierto: boolean, alternar: () => void, destino: string}}} props
 *   seccion: título de la pantalla activa; usuario: sesión vigente con
 *   nombre, apellido y rol; onCerrarSesion: acción de cierre de sesión.
 *   menuControl: control opcional del menú lateral móvil; cuando llega, se
 *   presenta el botón hamburguesa antes del título. Solo tiene
 *   efecto en pantallas angostas (el botón se oculta por CSS en escritorio).
 * @returns {import('react').ReactElement} Encabezado superior del shell.
 */
export function EncabezadoSuperior({
  seccion,
  usuario,
  onCerrarSesion,
  menuControl = null
}) {
  const nombreCompleto = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ');
  return <header className="ui-cabecera">
      {menuControl ? <button type="button" className="ui-cabecera__menu"
        aria-label={menuControl.abierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
        aria-expanded={menuControl.abierto} aria-controls={menuControl.destino}
        onClick={menuControl.alternar}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {menuControl.abierto
            ? <path d="M6 6l12 12M18 6L6 18" />
            : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button> : null}
      <h1 className="ui-cabecera__seccion">{seccion}</h1>

      <div className="ui-cabecera__identidad">
        <span className="ui-cabecera__marca">
          <BrandLogo surface="dark" compact />
        </span>
        <span className="ui-cabecera__datos">
          <span className="ui-cabecera__nombre">{nombreCompleto !== '' ? nombreCompleto :
            '—'}</span>
          <span className="ui-cabecera__rol">{usuario?.rol ?? ''}</span>
        </span>
      </div>

      <button type="button" className="ui-cabecera__salir" onClick={onCerrarSesion}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={ICONO_SALIDA} />
        </svg>
        <span>Cerrar sesión</span>
      </button>
    </header>;
}
