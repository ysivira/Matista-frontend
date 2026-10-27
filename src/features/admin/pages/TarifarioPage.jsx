/**
 * MATISTA - Frontend · Administración
 * Archivo: TarifarioPage.jsx
 *
 * RESPONSABILIDAD:
 * Página TarifarioPage del módulo Administración; compone componentes de la feature para su caso de
 * uso.
 *
 * CONTENIDO:
 * - Función TarifarioPage.
 *
 * DEPENDENCIAS:
 * - ../api/adminApi.js
 * - ../../../shared/catalogo/ConsultaTarifario.jsx
 */
import { adminApi } from '../api/adminApi.js';
import { ConsultaTarifario } from '../../../shared/catalogo/ConsultaTarifario.jsx';

/**
 * Compone la consulta de tarifas ADMIN; la gestión de versiones y aumentos permanece en sus páginas
 * propias.
 * @param {{api?: object, modoConsulta?: boolean}} props Interfaz anterior de consulta conservada,
 * sin añadir permisos.
 * @returns {import('react').ReactElement} Matriz vigente con sus documentos y filtros existentes.
 */
export function TarifarioPage({
  api = adminApi,
  modoConsulta = false
}) {
  return <ConsultaTarifario api={api} etiqueta={modoConsulta
    ? 'Módulo ASESOR · Consulta de precios' : 'Módulo ADMIN · Tarifario comercial'} />;
}
