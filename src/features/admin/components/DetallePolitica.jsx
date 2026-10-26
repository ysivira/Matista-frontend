import { CAMPOS_POLITICA, GRUPOS, presentarValor, formatearPorcentaje } from './politicaPresentacion.js'

/** Renderiza los valores de una versión agrupados según la pantalla vigente. */
export function DetallePolitica({ politica, compacto = false }) {
  return (
    <div className={`admin-config__grupos${compacto ? ' admin-config__grupos--compactos' : ''}`}>
      {GRUPOS.map((grupo) => (
        <section key={grupo} className="admin-config__grupo">
          <h3 className="admin-config__grupo-titulo">{grupo}</h3>
          <div className="admin-config__grid">
            {CAMPOS_POLITICA.filter((campo) => campo.grupo === grupo).map((campo) => (
              <div key={campo.name} className="admin-config__campo">
                <span className="admin-config__label">{campo.label}</span>
                <span className="admin-config__valor">{presentarValor(campo, politica)}</span>
                {campo.help ? <p className="admin-config__help">{campo.help}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ))}
      <section className="admin-config__grupo">
        <h3 className="admin-config__grupo-titulo">Descuentos comerciales autorizados</h3>
        <div className="admin-config__chips" aria-label="Descuentos comerciales autorizados">
          {(politica?.porcentajes_comerciales ?? []).length > 0
            ? politica.porcentajes_comerciales.map((porcentaje) => (
              <span key={String(porcentaje)} className="admin-config__chip">
                {formatearPorcentaje(porcentaje)}
              </span>
            ))
            : <span className="admin-config__vacio">No hay descuentos configurados.</span>}
        </div>
      </section>
    </div>
  )
}

