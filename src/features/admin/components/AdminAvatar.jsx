/**
 * Avatar de iniciales del diseño Stitch (Amethyst Prism Enterprise).
 * @param {{iniciales: string, pequeno?: boolean}} props Iniciales calculadas del nombre.
 * @returns {import('react').ReactElement} Círculo con iniciales pale violet.
 */
export function AdminAvatar({ iniciales, pequeno = false }) {
  const texto = (iniciales || '—').slice(0, 2).toUpperCase()
  const clase = pequeno ? 'admin-avatar admin-avatar--small' : 'admin-avatar'
  return <span className={clase} aria-hidden="true">{texto}</span>
}
