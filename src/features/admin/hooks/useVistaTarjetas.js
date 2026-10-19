import { useSyncExternalStore } from 'react'

/**
 * Media query que gobierna el cambio de presentación del directorio.
 * Por debajo de 1024 px la tabla no muestra todas sus columnas sin scroll
 * horizontal, por lo que se sustituye por tarjetas de empleado.
 */
const CONSULTA_TARJETAS = '(max-width: 1023.98px)'

/**
 * Consulta la media query del navegador cuando está disponible; en entornos
 * sin matchMedia (por ejemplo pruebas con jsdom) devuelve null para computar
 * la presentación de tabla de escritorio, que es la original de SL-1.
 * @returns {?MediaQueryList} Media query activa o null.
 */
function consultaTarjetas() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia(CONSULTA_TARJETAS)
}

/**
 * Suscribe el cambio de ancho de ventana según la media query del directorio.
 * @param {() => void} notificar Callback de React al cambiar la coincidencia.
 * @returns {() => void} Limpieza de la suscripción.
 */
function suscribirViewport(notificar) {
  const consulta = consultaTarjetas()
  if (!consulta) return () => {}
  consulta.addEventListener('change', notificar)
  return () => consulta.removeEventListener('change', notificar)
}

/**
 * Snapshot del ancho actual: tarjetas por debajo de 1024 px.
 * @returns {boolean} True cuando el viewport corresponde a tarjetas.
 */
function snapshotViewport() {
  return consultaTarjetas()?.matches ?? false
}

/**
 * Snapshot del entorno sin viewport disponible: la tabla de escritorio
 * permanece como presentación original.
 * @returns {boolean} False estable para entornos sin matchMedia.
 */
function snapshotSinViewport() {
  return false
}

/**
 * Indica si el directorio debe presentarse como tarjetas en este viewport.
 * @returns {boolean} True cuando se debe renderizar la lista de tarjetas.
 */
export function useVistaTarjetas() {
  return useSyncExternalStore(suscribirViewport, snapshotViewport, snapshotSinViewport)
}
