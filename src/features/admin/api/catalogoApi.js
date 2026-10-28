/**
 * ============================================================
 * MATISTA | COMPATIBILIDAD DEL CLIENTE DE CATÁLOGO
 * ============================================================
 *
 * Archivo: catalogoApi.js
 * Módulo: Administración
 *
 * Responsabilidad:
 * Reexportar el cliente compartido de catálogo desde su ruta ADMIN anterior.
 *
 * CONTENIDO:
 * - Exporta catalogoApi.
 * - Exporta consultarCatalogo.
 * - Exporta documentoCatalogo.
 *
 * DEPENDENCIAS:
 * - ../../../shared/api/catalogoApi.js
 *
 * OBSERVACIONES:
 * Ruta anterior compatible; el catálogo de consulta no pertenece a la gestión ADMIN.
 *
 * ============================================================
 */
export { catalogoApi, consultarCatalogo,
  documentoCatalogo } from '../../../shared/api/catalogoApi.js';
