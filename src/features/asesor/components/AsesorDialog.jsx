/**
 * MATISTA - Frontend · Asesor comercial
 * Archivo: AsesorDialog.jsx
 *
 * RESPONSABILIDAD:
 * Componente AsesorDialog del módulo Asesor comercial; unidad de interfaz reutilizable de la
 * feature.
 *
 * CONTENIDO:
 * - Función AsesorDialog.
 *
 * DEPENDENCIAS:
 * - react
 */
import { useEffect, useRef } from 'react';

/** Diálogo nativo con encabezado opcional para composiciones Stitch; conserva foco, Escape y cierre del módulo. */
export function AsesorDialog({
  title,
  onClose,
  children,
  footer,
  header,
  showHeader = true,
  className = ''
}) {
  const dialog = useRef(null);
  useEffect(() => {
    const node = dialog.current;
    if (typeof node.showModal === 'function') node.showModal();
    else node.setAttribute('open', '');
    return () => {
      if (typeof node.close === 'function') node.close();
    };
  }, []);
  return <dialog
    ref={dialog}
    className={`ase-ui ase-dialog ${className}`}
    aria-label={title}
    onCancel={e => {
      e.preventDefault();
      onClose();
    }}
    onClick={e => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    {showHeader && <header className="ase-dialog-header">
      {header ?? <h2>{title}</h2>}
      <button
        type="button"
        className="ase-icon-button"
        aria-label="Cerrar"
        onClick={onClose}
      >×</button>
    </header>}
    <div className="ase-dialog-body">{children}</div>
    {footer && <footer className="ase-workspace-actions">{footer}</footer>}
  </dialog>;
}
