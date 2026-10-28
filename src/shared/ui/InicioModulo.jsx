/**
 * ============================================================
 * MATISTA | INICIO DE MÓDULO
 * ============================================================
 *
 * Archivo: InicioModulo.jsx
 * Módulo: Interfaz compartida
 *
 * Responsabilidad:
 * Presentar accesos de navegación y puntos descriptivos de
 * cada módulo sobre el lienzo institucional compartido.
 *
 * ============================================================
 */
import { Link } from 'react-router-dom';
import { EncabezadoContextual } from './EncabezadoContextual.jsx';
import { IconoNavegacion } from './IconoNavegacion.jsx';
import './inicioModulo.css';

/**
 * Reutiliza las secciones MATISTA para navegar a las funciones autorizadas de
 * cada módulo, con el rediseño oscuro institucional: secciones integradas al
 * fondo institucional (sin tarjetas blancas), ícono violeta, título blanco,
 * descripción clara, línea divisoria fina y puntos descriptivos del área.
 * Los `puntos` son solo descriptivos: no crean rutas ni accesos nuevos; los
 * permisos y la navegación viven en el router y el backend.
 * @param {{etiqueta:string, descripcion:string, accesos:object[]}} props Datos de
 *   presentación; no otorgan permisos.
 * @returns {import('react').ReactElement} Presentación accesible sin operaciones de negocio.
 */
export function InicioModulo({
  etiqueta,
  descripcion,
  accesos
}) {
  return <><EncabezadoContextual etiqueta={etiqueta} titulo="Inicio" descripcion={descripcion} />
    <div className="inicio-modulo">
      {accesos.map(acceso => <Link key={acceso.ruta} to={acceso.ruta}
        className="inicio-modulo__seccion">
        <div className="inicio-modulo__cabeza">
          <span className="inicio-modulo__icono" aria-hidden="true"><IconoNavegacion trazo={acceso.icono}
            tamano={24} /></span>
          <div className="inicio-modulo__titular">
            <h3>{acceso.tituloTarjeta}<span className="inicio-modulo__chevron"
              aria-hidden="true">›</span></h3>
            <p>{acceso.detalle}</p>
          </div>
        </div>
        {acceso.puntos?.length ? <>
          <div className="inicio-modulo__linea" aria-hidden="true" />
          <ul className="inicio-modulo__puntos">
            {acceso.puntos.map(punto => <li key={punto}><span className="inicio-modulo__punto"
              aria-hidden="true" />{punto}</li>)}
          </ul>
        </> : null}
      </Link>)}
    </div></>;
}
