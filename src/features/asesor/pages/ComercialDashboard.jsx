import { InicioModulo } from '../../../shared/ui/InicioModulo.jsx'
import { NAVEGACION_ASESOR } from '../../../shared/ui/navegacionModulos.js'
import '../asesor.css'

/** Presenta Inicio ASESOR con los cinco accesos comerciales del menú, sin operaciones administrativas. */
export function ComercialDashboard() {
  return <InicioModulo etiqueta="Gestión comercial" descripcion="Catálogo, cotizaciones y condiciones comerciales." accesos={NAVEGACION_ASESOR.slice(1)} />
}
