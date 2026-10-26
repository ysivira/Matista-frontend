import { Link } from 'react-router-dom'
import { EncabezadoContextual } from './EncabezadoContextual.jsx'
import { IconoNavegacion } from './IconoNavegacion.jsx'
import './inicioModulo.css'

/**
 * Reutiliza las tarjetas MATISTA para navegar a las funciones autorizadas de cada módulo.
 * @param {{etiqueta:string, descripcion:string, accesos:object[]}} props Datos de presentación; no otorgan permisos.
 * @returns {import('react').ReactElement} Presentación accesible sin operaciones de negocio.
 */
export function InicioModulo({ etiqueta, descripcion, accesos }) {
  return <><EncabezadoContextual etiqueta={etiqueta} titulo="Inicio" descripcion={descripcion} />
    <div className="inicio-modulo">
      {accesos.map(acceso => <Link key={acceso.ruta} to={acceso.ruta} className="inicio-modulo__tarjeta">
        <span className="inicio-modulo__icono"><IconoNavegacion trazo={acceso.icono} tamano={27} /></span>
        <div><h3>{acceso.tituloTarjeta}</h3><p>{acceso.detalle}</p></div><span className="inicio-modulo__flecha" aria-hidden="true">↗</span>
      </Link>)}
    </div></>
}
