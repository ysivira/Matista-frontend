import { TarifarioPage } from '../../admin/pages/TarifarioPage.jsx'
import { catalogoApi } from '../../admin/api/catalogoApi.js'

/** Reutiliza la pantalla ADMIN de precios en modo consulta, sin interfaz paralela. */
export function ListasPage() {
  return <TarifarioPage api={catalogoApi} modoConsulta />
}
