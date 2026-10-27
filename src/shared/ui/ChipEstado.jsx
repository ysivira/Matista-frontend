/**
 * Etiqueta visual del estado administrativo recibido.
 */
import { etiquetaEstado } from '../lib/etiquetasEstado.js';

/**
 * Píldora de estado del diseño Stitch con su punto de color asociado.
 * Reutilizada por la tabla del directorio, las tarjetas móviles y los modales;
 * los estados del ciclo del tarifario se muestran con etiqueta amigable.
 * @param {{estado: string}} props Estado del DTO público.
 * @returns {import('react').ReactElement} Chip accesible con etiqueta amigable.
 */
export function ChipEstado({
  estado
}) {
  return <span className={`admin-chip ${claseEstado(estado)}`}>{etiquetaEstado(estado)}</span>;
}

/**
 * Deriva la clase de píldora de estado para chips y modales según negocio.
 * @param {string} estado Estado del DTO público.
 * @returns {string} Clase CSS del chip de estado.
 */
function claseEstado(estado) {
  return `admin-chip--estado-${String(estado || '').toLowerCase()}`;
}
