/**
 * ============================================================
 * MATISTA | AVATAR DE INICIALES
 * ============================================================
 *
 * Archivo: Avatar.jsx
 * Módulo: Interfaz compartida
 *
 * Responsabilidad:
 * Presentar hasta dos iniciales en variantes normal o pequeña,
 * sin duplicar la identidad accesible que acompaña al avatar.
 *
 * ============================================================
 */
/**
 * Avatar de iniciales del diseño Stitch (Amethyst Prism Enterprise).
 * @param {{iniciales: string, pequeno?: boolean}} props Iniciales calculadas del nombre.
 * @returns {import('react').ReactElement} Círculo con iniciales pale violet.
 */
export function Avatar({
  iniciales,
  pequeno = false
}) {
  const texto = (iniciales || '—').slice(0, 2).toUpperCase();
  const clase = pequeno ? 'admin-avatar admin-avatar--small' : 'admin-avatar';
  return <span className={clase} aria-hidden="true">{texto}</span>;
}
