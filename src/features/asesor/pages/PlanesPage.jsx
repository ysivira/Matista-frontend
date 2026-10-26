import { ConsultaPlanes } from '../../../shared/catalogo/ConsultaPlanes.jsx'
import { catalogoApi } from '../../../shared/api/catalogoApi.js'

/**
 * Compone exclusivamente la consulta de planes permitida a ASESOR con el catálogo común.
 * @returns {import('react').ReactElement} Planes y enlaces de consulta sin API administrativa.
 */
export function PlanesAsesorPage() {
  return <ConsultaPlanes api={catalogoApi} etiqueta="Módulo ASESOR · Catálogo oficial" rutaTarifario="/asesor/precios" />
}
