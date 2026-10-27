/**
 * MATISTA - Frontend · Administración
 * Archivo: AdminInicioPage.jsx
 *
 * RESPONSABILIDAD:
 * Página AdminInicioPage del módulo Administración; compone componentes de la feature para su caso
 * de uso.
 *
 * CONTENIDO:
 * - Función AdminInicioPage.
 *
 * DEPENDENCIAS:
 * - ../../../shared/ui/InicioModulo.jsx
 * - ../../../shared/ui/navegacionModulos.js
 */
import { InicioModulo } from '../../../shared/ui/InicioModulo.jsx';
import { NAVEGACION_ADMIN } from '../../../shared/ui/navegacionModulos.js';

/** Da la bienvenida a ADMIN y enlaza sus cinco páginas existentes bajo el mismo guard de rol. */
export function AdminInicioPage() {
  return <InicioModulo etiqueta="Administración"
    descripcion="Empleados, catálogo, precios y configuración comercial."
    accesos={NAVEGACION_ADMIN.slice(1)} />;
}
