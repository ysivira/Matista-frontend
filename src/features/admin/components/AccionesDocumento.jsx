import { documentoCatalogo } from '../api/catalogoApi.js'
import '../../../shared/ui/documentos.css'

/**
 * Acciones compartidas de documentos: impresión y PDF usan la misma presentación del servidor.
 * @param {{recurso:string}} props Ruta autorizada de plan o lista, sin parámetros económicos.
 * @returns {import('react').ReactElement} Dos acciones accesibles sin controles de exportación CSV.
 */
export function AccionesDocumento({ recurso, etiquetaImprimir = 'Imprimir', etiquetaPdf = 'Exportar PDF' }) {
  return <div className="admin-documentos matista-no-print" aria-label="Acciones del documento">
    <a className="admin-documento-accion admin-documento-accion--imprimir" href={documentoCatalogo(`${recurso}/impresion`)} target="_blank" rel="noreferrer">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M7 8V3h10v5M7 17H4V8h16v9h-3M7 14h10v7H7zM16 11h1" /></svg>{etiquetaImprimir}
    </a>
    <a className="admin-documento-accion admin-documento-accion--pdf" href={documentoCatalogo(`${recurso}/pdf`)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M14 2H5v20h14V7zM14 2v6h5M12 11v7m-3-3 3 3 3-3" /></svg>{etiquetaPdf}
    </a>
  </div>
}
