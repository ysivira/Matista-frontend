import { ConsultaTarifario } from '../../../shared/catalogo/ConsultaTarifario.jsx'
import { catalogoApi } from '../../../shared/api/catalogoApi.js'

/**
 * Consulta precios mediante componentes y API comunes, sin importar páginas ni escrituras ADMIN.
 * @returns {import('react').ReactElement} Lista compartida en el contexto ASESOR existente.
 */
export function ListasPage() {
  return <ConsultaTarifario api={catalogoApi} etiqueta="Módulo ASESOR · Consulta de precios" />
}
