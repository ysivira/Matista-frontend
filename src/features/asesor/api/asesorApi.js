import { httpClient } from '../../../shared/lib/httpClient.js'
import { catalogoApi, consultarCatalogo } from '../../../shared/api/catalogoApi.js'

/** Consulta el mismo catálogo ADMIN mediante las rutas compartidas autorizadas. */
export function listarPlanes() {
  return catalogoApi.listarPlanes()
}

/** Construye una ruta ASESOR sin permitir segmentos de otro módulo. */
export function rutaAsesor(ruta) {
  return `/api/asesor/${ruta}`
}

/** Persiste una operación comercial; el backend determina actor y rechaza resultados económicos. */
export function guardarAsesor(ruta, body, method = 'POST') {
  return httpClient.request(rutaAsesor(ruta), { method, body })
}

/** Carga datos ASESOR con cookie AUTH, incluyendo filtros ya codificados. */
export function consultarAsesor(ruta) {
  if (['planes', 'condiciones'].includes(ruta) || ruta.startsWith('tarifario/planes/')) return consultarCatalogo(ruta)
  return httpClient.request(rutaAsesor(ruta))
}

export const asesorCatalogoApi = catalogoApi
