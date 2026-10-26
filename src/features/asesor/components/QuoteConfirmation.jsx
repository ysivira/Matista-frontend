import { Link, useNavigate } from 'react-router-dom'
import { AsesorDialog } from './AsesorDialog.jsx'
import { formatearPrecioARS } from '../../admin/components/formatoMonetario.js'

/** Muestra únicamente una emisión confirmada y releída del backend; nunca fabrica número, plan o importe. */
export function QuoteConfirmation({ cotizacion }) {
  const navigate = useNavigate()
  if (cotizacion.estado !== 'EMITIDA' || !cotizacion.numero || !cotizacion.resultado) return null
  const c = cotizacion.solicitud.cliente
  return <AsesorDialog title="¡Cotización generada con éxito!" showHeader={false} className="ase-quote-confirmation" onClose={() => navigate('/asesor/cotizaciones')}>
    <div className="ase-success">
      <div className="ase-success-icon" aria-hidden="true">✓</div>
      <h1>¡Cotización generada con éxito!</h1>
      <p>La cotización comercial ha sido registrada y validada correctamente en el sistema central de Matista.</p>
      <div className="ase-success-number"><small>NÚMERO OFICIAL ASIGNADO</small><strong># {cotizacion.numero}</strong></div>
      <dl className="ase-success-summary">
        <div><dt><span aria-hidden="true" className="ase-symbol">person</span>Titular:</dt><dd>{c.nombres} {c.apellidos}{c.dni ? ` (DNI ${c.dni})` : ''}</dd></div>
        <div><dt><span aria-hidden="true" className="ase-symbol">shield</span>Plan seleccionado:</dt><dd>{cotizacion.solicitud.plan.nombre}</dd></div>
        <div><dt><span aria-hidden="true" className="ase-symbol">payments</span>Total Mensual Inicial:</dt><dd>{formatearPrecioARS(cotizacion.resultado.total)} / mes</dd></div>
      </dl>
      <a className="ase-primary-link" href={`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/asesor/cotizaciones/${cotizacion.id}/pdf`}><span aria-hidden="true" className="ase-symbol">picture_as_pdf</span>Descargar PDF Oficial</a>
      <Link className="ase-success-history" to="/asesor/cotizaciones"><span aria-hidden="true" className="ase-symbol">format_list_bulleted</span>Ver en Mis Cotizaciones</Link>
      <Link className="ase-text-button" to="/asesor/nueva"><span aria-hidden="true" className="ase-symbol">add_circle_outline</span>Iniciar Nueva Cotización</Link>
    </div>
  </AsesorDialog>
}
