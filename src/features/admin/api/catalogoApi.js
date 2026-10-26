import { httpClient } from '../../../shared/lib/httpClient.js'

/** Lee el catálogo único de ADMIN mediante endpoints de consulta autorizados para ambos roles. */
export function consultarCatalogo(ruta) {
  return httpClient.request(`/api/catalogo/${ruta}`)
}

/** Devuelve un enlace de descarga autenticada, sin trasladar datos económicos al navegador. */
export function documentoCatalogo(ruta) {
  return `${(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')}/api/catalogo/${ruta}`
}

export const catalogoApi = {
  /** Consulta los planes activos de ADMIN. */
  listarPlanes() { return consultarCatalogo('planes') },
  /** Consulta la misma matriz de precios que utiliza la gestión administrativa. */
  consultarTarifario(planId, modalidad) { return consultarCatalogo(`tarifario/planes/${encodeURIComponent(planId)}/${encodeURIComponent(modalidad)}`) },
}
