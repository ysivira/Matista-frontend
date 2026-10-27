/**
 * MATISTA - Frontend · Administración
 * Archivo: catalogoApi.js
 *
 * RESPONSABILIDAD:
 * Cliente HTTP del módulo Administración; centraliza las llamadas a los endpoints del backend.
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
 */
export { catalogoApi, consultarCatalogo,
  documentoCatalogo } from '../../../shared/api/catalogoApi.js';
