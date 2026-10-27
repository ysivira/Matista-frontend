/**
 * MATISTA - Frontend · Asesor comercial
 * Archivo: QuoteDetail.jsx
 *
 * RESPONSABILIDAD:
 * Página QuoteDetail del módulo Asesor comercial; compone componentes de la feature para su caso de
 * uso.
 *
 * CONTENIDO:
 * - Función QuoteDetail.
 *
 * DEPENDENCIAS:
 * - react
 * - react-router-dom
 * - ../api/asesorApi.js
 * - ../hooks/useAsesorConsulta.js
 * - ../components/QuoteReview.jsx
 * - ../components/AsesorDialog.jsx
 * - ../components/QuoteConfirmation.jsx
 * - ../stitch.css
 */
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { guardarAsesor } from '../api/asesorApi.js';
import { useAsesorConsulta } from '../hooks/useAsesorConsulta.js';
import { QuoteReview } from '../components/QuoteReview.jsx';
import { AsesorDialog } from '../components/AsesorDialog.jsx';
import { QuoteConfirmation } from '../components/QuoteConfirmation.jsx';
import '../stitch.css';

/** Relee el snapshot autorizado; tras emitir muestra confirmación sin repetir mutaciones al recargar la ruta. */
export function QuoteDetail() {
  const {
    id
  } = useParams();
  const location = useLocation();
  const consulta = useAsesorConsulta(`cotizaciones/${encodeURIComponent(id)}`);
  if (consulta.loading) return <p role="status">Cargando detalle...</p>;
  if (consulta.error) return <p role="alert">{consulta.error}</p>;
  if (location.state?.cotizacionConfirmada
    && consulta.data.estado === 'EMITIDA') return <QuoteConfirmation cotizacion={consulta.data} />;
  return <QuoteDetailContent key={`${id}-${consulta.data.revision}`} q={consulta.data}
    recargar={consulta.recargar} />;
}

/** Presenta el snapshot y diálogos específicos para contacto, anulación y recotización, sin recalcular historia. */
function QuoteDetailContent({
  q,
  recargar
}) {
  const navigate = useNavigate();
  const [contacto, setContacto] = useState(q.contacto ?? {});
  const [motivo, setMotivo] = useState('');
  const [aviso, setAviso] = useState('');
  const [busy, setBusy] = useState(false);
  const [accion, setAccion] = useState(null);
  const [confirmada, setConfirmada] = useState(false);
  /** Envía revisión y datos permitidos; ante fallo conserva el motivo o contacto introducido. */
  async function operar(accion, body, method = 'POST') {
    setBusy(true);
    setAviso('');
    try {
      await guardarAsesor(`cotizaciones/${q.id}/${accion}`, body, method);
      setAccion(null);
      recargar();
    } catch (error) {
      setAviso(error.message);
    } finally {
      setBusy(false);
    }
  }
  /** Abre una acción sin enviar mutaciones hasta que el asesor confirme el formulario correspondiente. */
  function abrir(tipo) {
    setAviso('');
    setContacto(q.contacto ?? {});
    setMotivo('');
    setConfirmada(false);
    setAccion(tipo);
  }
  /** Regresa al detalle sin perder el registro ni ejecutar la acción pendiente. */
  function cancelar() {
    if (!busy) {
      setAviso('');
      setAccion(null);
    }
  }
  if (accion === 'contacto') return <AsesorDialog key="contacto"
    title="Editar contacto del cliente" onClose={cancelar} footer={<><button type="button"
    className="ase-secondary" disabled={busy} onClick={cancelar}>Cancelar</button><button type="submit"
    form="ase-editar-contacto" disabled={busy}>Guardar contacto</button></>}>
    <p>Se actualizan el correo electrónico y el teléfono de esta cotización. Sus importes y número oficial se conservan.</p>
    <form id="ase-editar-contacto" onSubmit={e => {
      e.preventDefault();
      void operar('contacto', {
        revision: q.revision,
        contacto
      }, 'PATCH');
    }}><fieldset disabled={busy} className="ase-operation"><div className="ase-grid">{[['email',
      'Correo electrónico'], ['telefono', 'Teléfono']].map(([k,
      l]) => <label key={k}>{l}<input type={k === 'email' ? 'email' : 'tel'} maxLength={k === 'email'
      ? 254 : 40} value={contacto[k] ?? ''} onChange={e => setContacto(c => ({
              ...c,
              [k]: e.target.value
            }))} /></label>)}</div></fieldset></form>
    {aviso && <p role="alert" className="ase-notice">{aviso}</p>}
  </AsesorDialog>;
  if (accion === 'anulacion') return <AsesorDialog key="anulacion" title="Anular cotización"
    onClose={cancelar} footer={<><button type="button" className="ase-secondary" disabled={busy}
    onClick={cancelar}>Cancelar</button><button type="submit" form="ase-anular"
    className="ase-danger-button" disabled={busy || !motivo.trim()
    || !confirmada}>Confirmar anulación</button></>}>
    <p>Se anulará {q.numero ?? `la preparación #${q.id}`}. El registro y su trazabilidad se conservan. No se borran datos.</p>
    <form id="ase-anular" onSubmit={e => {
      e.preventDefault();
      if (motivo.trim() && confirmada) void operar('anulacion', {
        revision: q.revision,
        motivo
      });
    }}>
      <fieldset disabled={busy} className="ase-operation">
        <label>Motivo de anulación<textarea required maxLength="255"
      value={motivo}
      onChange={e => setMotivo(e.target.value)} /></label>
        <label className="ase-confirm-action"><input type="checkbox" required checked={confirmada} onChange={e => setConfirmada(e.target.checked)} />Confirmo que deseo anular esta cotización.</label>
      </fieldset>
    </form>
    {aviso && <p role="alert" className="ase-notice">{aviso}</p>}
  </AsesorDialog>;
  if (accion === 'recotizar') return <AsesorDialog key="recotizar" title="Preparar recotización"
    onClose={cancelar} footer={<><button type="button" className="ase-secondary"
    onClick={cancelar}>Cancelar</button><Link className="ase-primary-link"
    to={`/asesor/cotizaciones/${q.id}/recotizar`}>Continuar a recotización</Link></>}>
    <p>Se recuperarán los integrantes y sus edades guardadas para preparar una nueva cotización con tarifas y políticas vigentes.</p><p>La cotización original {q.numero ?? `#${q.id}`} no se modifica. El nuevo registro conservará el vínculo de origen y su trazabilidad.</p>
  </AsesorDialog>;
  return <AsesorDialog title="Detalle de Cotización" className="ase-quote-detail"
    onClose={() => navigate('/asesor/cotizaciones')}
    header={<div className="ase-detail-heading">
      <div>
        <h2>Detalle de Cotización</h2>
        <h3 className="ase-detail-number">{q.numero ?? `Preparación #${q.id}`}</h3>
        <span className={`ase-state ase-state--${q.estado.toLowerCase()}`}>{q.estado}</span>
      </div>
      <p>{q.emitida_at ? `Emitida el ${new Date(q.emitida_at).toLocaleString('es-AR')}` : 'Borrador sin emisión'} · Revisión {q.revision}{q.vencida ? ' · Vencida' : ''}</p>
    </div>}
    footer={<>
      <button type="button" className="ase-secondary" onClick={() => navigate('/asesor/cotizaciones')}>Cerrar</button>
      <div>
        {q.resultado && q.numero && q.estado !== 'ANULADA' && <a
          className="ase-primary-link"
          href={`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/asesor/cotizaciones/${q.id}/pdf`}
        >Descargar PDF Oficial</a>}
        {q.estado !== 'ANULADA' && <>
          <button type="button" className="ase-secondary" onClick={() => abrir('contacto')}>Editar correo y teléfono</button>
          <button type="button" className="ase-secondary" onClick={() => abrir('recotizar')}>Recotizar</button>
          <button type="button" className="ase-danger-button" onClick={() => abrir('anulacion')}>Anular cotización</button>
        </>}
        {q.estado === 'BORRADOR' && <Link
          className="ase-primary-link"
          to={`/asesor/cotizaciones/${q.id}/preparacion`}
        >Calcular y emitir</Link>}
      </div>
    </>}
  >
    <QuoteReview solicitud={q.solicitud} resultado={q.resultado} contacto={q.contacto} detail />
    {!q.resultado
      && <p className="ase-notice">Preparación sin emisión. Complete los datos y calcule para revisar el resultado económico.</p>}
    {aviso && <p role="alert" className="ase-notice">{aviso}</p>}
    <details className="ase-detail-extra">
      <summary>Recotizaciones, trazabilidad y referencias históricas</summary>
      <p>Tarifa #{q.tarifa_version_id} · Política #{q.politica_id}</p>
      {q.origen_id && <p>Recotización de <Link to={`/asesor/cotizaciones/${q.origen_id}`}>#{q.origen_id}</Link></p>}
      <ul>
        {q.recotizaciones.map(r => <li key={r.id}>
          <Link to={`/asesor/cotizaciones/${r.id}`}>#{r.id} · {r.estado}</Link>
        </li>)}
      </ul>
      <ul>
        {q.eventos.map((e, i) => <li key={i}>{e.evento} · {new Date(e.created_at).toLocaleString('es-AR')}</li>)}
      </ul>
      <p>Los importes históricos se presentan desde su snapshot; los cambios económicos requieren una nueva cotización.</p>
    </details>
  </AsesorDialog>;
}
