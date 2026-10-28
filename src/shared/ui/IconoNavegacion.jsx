/**
 * ============================================================
 * MATISTA | ICONO DE NAVEGACIÓN
 * ============================================================
 *
 * Archivo: IconoNavegacion.jsx
 * Módulo: Interfaz compartida
 *
 * Responsabilidad:
 * Presentar un trazo SVG decorativo recibido por los menús y
 * accesos, sin conceder permisos ni definir destinos.
 *
 * ============================================================
 */
/**
 * Presenta un trazo SVG MATISTA decorativo con el estilo común de menús y tarjetas.
 * @param {{trazo:string, tamano?:number}} props Datos de presentación; no otorgan permisos.
 * @returns {import('react').ReactElement} Presentación accesible sin operaciones de negocio.
 */
export function IconoNavegacion({
  trazo,
  tamano = 17
}) {
  return <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true"><path d={trazo} /></svg>;
}
