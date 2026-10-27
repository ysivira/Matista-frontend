/**
 * Contenedor modal compartido con cabecera, contenido y acciones.
 */
/**
 * Modal de la identidad Stitch: backdrop oscuro, tarjeta clara redondeada y
 * encabezado con icono contextual. Lo usan el detalle, la confirmación y el
 * aviso de éxito del directorio; solo presenta, la regla vive en el servidor.
 * @param {{
 *   label: string,
 *   title: string,
 *   subtitle?: string,
 *   tone?: 'danger'|'primary'|'success',
 *   icon?: import('react').ReactNode,
 *   center?: boolean,
 *   className?: string,
 *   onClose?: () => void,
 *   children?: import('react').ReactNode,
 *   footer?: import('react').ReactNode,
 * }} props Contenido y comportamiento del modal.
 * @returns {import('react').ReactElement} Diálogo accesible con backdrop.
 */
export function Modal({
  label,
  title,
  subtitle,
  tone = 'primary',
  icon,
  center = false,
  className = '',
  onClose,
  children,
  footer
}) {
  return <div className="admin-modal__backdrop" role="presentation" onClick={onClose}>
      <div className={`${center ? 'admin-modal admin-modal--center' : 'admin-modal'}${className ? ` ${className}` : ''}`} role="dialog"
        aria-modal="true" aria-label={label} onClick={event => event.stopPropagation()}>
        {icon !== undefined ? <header className="admin-modal__header">
            <span className={`admin-modal__icon admin-modal__icon--${tone}`}>{icon}</span>
            <div>
              <h2 className="admin-modal__title">{title}</h2>
              <p className="admin-modal__subtitle">{subtitle}</p>
            </div>
            {onClose ? <button className="admin-modal__close" type="button" aria-label="Cerrar"
              onClick={onClose}>
                ✕
              </button> : null}
          </header> : null}
        <div className="admin-modal__body">{children}</div>
        {footer ? <div className={center ? 'admin-modal__actions admin-modal__actions--center' :
          'admin-modal__actions'}>{footer}</div> : null}
      </div>
    </div>;
}

/** Iconos en línea del diseño Stitch (trazos de una pieza, heredan el color). */

/**
 * Icono circular con signo de exclamación para cambios de estado restrictivos.
 * @returns {import('react').ReactElement} SVG decorativo.
 */
export function IconoAdvertencia() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 8v5" /><circle cx="12" cy="12" r="9" /><path d="M12 16.5h.01" />
    </svg>;
}

/**
 * Icono de verificación para reactivaciones y confirmaciones de éxito.
 * @returns {import('react').ReactElement} SVG decorativo.
 */
export function IconoCheck() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>;
}

/**
 * Icono de lupa para el buscador del directorio.
 * @returns {import('react').ReactElement} SVG decorativo.
 */
export function IconoLupa() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>;
}
