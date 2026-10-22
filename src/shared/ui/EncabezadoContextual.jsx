import './uiCompartidos.css'

/**
 * Encabezado contextual de un lienzo de trabajo, tomado del diseño aprobado
 * de ASESOR (Stitch «HEADER CONTEXTUAL»): etiqueta superior con punto pulsante
 * violeta, título dramático y descripción, con un espacio a la derecha para
 * las acciones o emblemas del módulo. Comparte la composición entre ADMIN y
 * ASESOR sin imponer textos: cada pantalla aporta etiqueta, título,
 * descripción y acciones propias.
 */

/**
 * Encabezado contextual compartido.
 * @param {{etiqueta?: string, titulo?: string, descripcion?: string, acciones?: import('react').ReactNode}} props
 *   etiqueta: texto corto en mayúsculas sobre el título (opcional);
 *   titulo: encabezado de la pantalla dentro del módulo (opcional);
 *   descripcion: bajada contextual (opcional);
 *   acciones: nodo a la derecha, como emblemas o botones (opcional).
 * @returns {import('react').ReactElement} Encabezado del lienzo de trabajo.
 */
export function EncabezadoContextual({ etiqueta, titulo, descripcion, acciones = null }) {
  return (
    <header className="ui-encabezado">
      <div className="ui-encabezado__texto">
        {etiqueta ? (
          <p className="ui-encabezado__etiqueta">
            <span className="ui-encabezado__punto" aria-hidden="true" />
            <span>{etiqueta}</span>
          </p>
        ) : null}
        {titulo ? <h2 className="ui-encabezado__titulo">{titulo}</h2> : null}
        {descripcion ? <p className="ui-encabezado__descripcion">{descripcion}</p> : null}
      </div>
      {acciones ? <div className="ui-encabezado__acciones">{acciones}</div> : null}
    </header>
  )
}
