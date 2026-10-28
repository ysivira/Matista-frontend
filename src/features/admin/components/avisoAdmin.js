/**
 * ============================================================
 * MATISTA | COMPATIBILIDAD DE AVISOS ADMIN
 * ============================================================
 *
 * Archivo: avisoAdmin.js
 * Módulo: Administración
 *
 * Responsabilidad:
 * Reexportar avisos de consulta y detección de sesión vencida.
 *
 * CONTENIDO:
 * - Exporta avisoAdminPara.
 * - Exporta sesionCayoPara.
 *
 * DEPENDENCIAS:
 * - ../../../shared/lib/avisosConsulta.js
 *
 * OBSERVACIONES:
 * Compatibilidad de códigos públicos: la presentación de avisos de consulta es compartida.
 *
 * ============================================================
 */
export { avisoAdminPara, sesionCayoPara } from '../../../shared/lib/avisosConsulta.js';
