import { useAsesorConsulta } from '../hooks/useAsesorConsulta.js'
import { EncabezadoContextual } from '../../../shared/ui/EncabezadoContextual.jsx'
import { DetallePolitica } from '../../admin/components/DetallePolitica.jsx'

/** Muestra parámetros publicados de ADMIN como referencia, sin editar ni aplicar fórmulas. */
export function CondicionesPage() {
  const { data, error, loading } = useAsesorConsulta('condiciones')
  return <><EncabezadoContextual etiqueta="Política compartida" titulo="Condiciones comerciales" descripcion="Parámetros publicados por ADMIN. Parámetros vigentes para las nuevas cotizaciones." />
    <section className="ase-panel">{loading && <p role="status">Cargando condiciones...</p>}{error && <p role="alert">{error}</p>}
    {data && <><h3>Política vigente #{data.politica.id}</h3>
    <DetallePolitica politica={{ ...data.politica, porcentajes_comerciales: data.politica.porcentajes_comerciales.map(p => p.porcentaje) }} />
    <p className="ase-notice">La categoría de Monotributo se registra para facturación y no determina el aporte económico.</p></>}
    </section></>
}
