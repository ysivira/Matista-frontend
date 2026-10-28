/**
 * ============================================================
 * MATISTA | INICIO COMERCIAL
 * ============================================================
 *
 * Archivo: ComercialDashboard.jsx
 * Módulo: Asesor
 *
 * Responsabilidad:
 * Presentar los accesos comerciales del inicio ASESOR sin operaciones ADMIN.
 *
 * CONTENIDO:
 * - Función ComercialDashboard.
 *
 * DEPENDENCIAS:
 * - ../../../shared/ui/InicioModulo.jsx
 * - ../../../shared/ui/navegacionModulos.js
 * - ../asesor.css
 *
 * ============================================================
 */
import { InicioModulo } from '../../../shared/ui/InicioModulo.jsx';
import { NAVEGACION_ASESOR } from '../../../shared/ui/navegacionModulos.js';
import '../asesor.css';

/** Presenta Inicio ASESOR con los cinco accesos comerciales del menú, sin operaciones administrativas. */
export function ComercialDashboard() {
  return <InicioModulo etiqueta="Gestión comercial"
    descripcion="Catálogo, cotizaciones y condiciones comerciales."
    accesos={NAVEGACION_ASESOR.slice(1)} />;
}
