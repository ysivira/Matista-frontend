/**
 * Modal institucional de procesamiento con el logo oficial de MATISTA.
 */
import { useEffect, useRef } from 'react';
import { BrandLogo } from './BrandLogo.jsx';
import './matistaLoadingModal.css';

/**
 * Modal compartido de procesamiento (SPEC-26): superposición semitransparente,
 * tarjeta oscura con borde violeta, logo oficial MATISTA con latido suave,
 * anillo orbital luminoso, tres puntos animados y aviso inferior. Solo
 * presenta: no anuncia etapas, porcentajes ni envíos confirmados; el estado
 * de la operación lo decide quien lo integra (registro en esta SPEC).
 * Totalmente descriptivo y accesible; respeta prefers-reduced-motion.
 * @param {{abierto: boolean, titulo?: string, descripcion?: string,
 *   aviso?: string}} props Estado de apertura y textos personalizables.
 * @returns {?import('react').ReactElement} Modal activo o null cuando está cerrado.
 */
export function MatistaLoadingModal({
  abierto,
  titulo = 'Estamos procesando tu solicitud',
  descripcion = 'Por favor, esperá unos instantes mientras completamos la operación.',
  aviso = 'No cierres esta ventana ni actualices la página. El proceso puede tardar unos segundos.'
}) {
  const referencia = useRef(null);
  useEffect(() => {
    // Gestión de foco: al abrirse, el diálogo recibe el foco para anunciar el
    // estado; al cerrarse, el navegador devuelve el foco al control previo.
    if (abierto) referencia.current?.focus();
  }, [abierto]);
  if (!abierto) return null;
  return <div className="matista-loading" role="presentation">
      <div className="matista-loading__caja" role="dialog" aria-modal="true" aria-busy="true"
        aria-label={titulo} tabIndex={-1} ref={referencia}>
        <div className="matista-loading__orbita" aria-hidden="true">
          <span className="matista-loading__anillo" />
          <span className="matista-loading__satelite matista-loading__satelite--a" />
          <span className="matista-loading__satelite matista-loading__satelite--b" />
          <span className="matista-loading__logo"><BrandLogo surface="dark" /></span>
        </div>
        <h2 className="matista-loading__titulo">{titulo}</h2>
        <p className="matista-loading__descripcion">{descripcion}</p>
        <div className="matista-loading__puntos" aria-hidden="true">
          <span /><span /><span />
        </div>
        <p className="matista-loading__aviso" role="status">
          <svg className="matista-loading__aviso-icono" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" />
          </svg>
          <span>{aviso}</span>
        </p>
      </div>
    </div>;
}
