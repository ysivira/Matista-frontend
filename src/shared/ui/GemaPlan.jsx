/**
 * Gema decorativa del plan con la paleta y los trazos existentes.
 */
import './uiCompartidos.css';
import { claveDePlan } from './gemasPlan.js';

/**
 * Gema identificatoria de un plan de salud, tomada del catálogo aprobado
 * del módulo ASESOR (Stitch «Catálogo de Planes de Salud»): ícono delineado
 * con paleta fija por plan (RUBÍ, ESMERALDA, ZAFIRO, DIAMANTE). Los nombres
 * desconocidos caen a una gema neutra, de modo que ningún plan queda sin
 * representación cuando el catálogo crece.
 */

/**
 * Gema del plan dentro de su superficie de color. Es un ícono decorativo:
 * el nombre real del plan siempre lo acompaña como texto accesible.
 * @param {{nombre?: string|null, tamano?: 'tarjeta'|'ficha'}} props
 *   nombre: nombre del plan; tamano: 'tarjeta' (default) o 'ficha'.
 * @returns {import('react').ReactElement} Ícono SVG de la gema del plan.
 */
export function GemaPlan({
  nombre,
  tamano = 'tarjeta'
}) {
  const clave = claveDePlan(nombre);
  return <span className={`ui-gema ui-gema--${clave} ui-gema--${tamano}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="6 3 18 3 22 9 12 22 2 9 6 3"></polygon>
        <polyline points="11 3 8 9 12 22"></polyline>
        <polyline points="13 3 16 9 12 22"></polyline>
        <line x1="2" x2="22" y1="9" y2="9"></line>
      </svg>
    </span>;
}
