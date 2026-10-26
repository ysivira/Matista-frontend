import { adminApi } from '../api/adminApi.js'
import { ConsultaPlanes } from '../../../shared/catalogo/ConsultaPlanes.jsx'

/**
 * Compone la consulta de planes ADMIN sin compartir su API de gestión con otras funcionalidades.
 * @param {{api?: object, basePath?: string}} props Contrato anterior de consulta, conservado para consumidores existentes.
 * @returns {import('react').ReactElement} Catálogo de lectura con su contexto y destino existentes.
 */
export function PlanesPage({ api = adminApi, basePath = '/admin' }) {
  return <ConsultaPlanes api={api}
    etiqueta={`${basePath === '/admin' ? 'Módulo ADMIN' : 'Módulo ASESOR'} · Catálogo oficial`}
    rutaTarifario={basePath === '/admin' ? '/admin/tarifario' : '/asesor/precios'} />
}
