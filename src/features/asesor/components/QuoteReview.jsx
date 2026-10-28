/**
 * ============================================================
 * MATISTA | REVISIÓN DE COTIZACIÓN
 * ============================================================
 *
 * Archivo: QuoteReview.jsx
 * Módulo: Asesor
 *
 * Responsabilidad:
 * Presentar identidad, familia y economía del snapshot sin recalcularlo.
 *
 * CONTENIDO:
 * - Función QuoteReview.
 *
 * DEPENDENCIAS:
 * - react
 * - ../../auth/context/SessionContext.js
 * - ./QuoteSummary.jsx
 * - ../../../shared/lib/formatoMonetario.js
 *
 * ============================================================
 */
import { useContext } from 'react';
import { SessionContext } from '../../auth/context/SessionContext.js';
import { QuoteSummary } from './QuoteSummary.jsx';
import { formatearPrecioARS } from '../../../shared/lib/formatoMonetario.js';

/** Presenta el snapshot sin recalcularlo; en detalle prioriza identidad, tres tarjetas y economía, dejando familia secundaria. */
export function QuoteReview({
  solicitud,
  resultado,
  contacto = {},
  detail = false
}) {
  const user = useContext(SessionContext)?.user;
  const c = solicitud.cliente,
    entrada = solicitud.entrada;
  const miembros = resultado?.integrantes ?? [{
    parentesco: 'TITULAR',
    edad: entrada.familia.titular.edad
  }, ...entrada.familia.miembros];
  const asesor = solicitud.asesor ?? user;
  const familia = <section>
    <h3>Detalle de Integrantes del Grupo Familiar</h3>
    <div className="ase-table">
      <table>
        <thead>
          <tr>
            <th>Integrante / Rol</th>
            <th>Nombre y apellido</th>
            <th>Edad</th>
            <th>Valor individual</th>
          </tr>
        </thead>
        <tbody>
          {miembros.map((m, i) => <tr key={i}>
            <td>{m.parentesco === 'TITULAR' ? 'Titular' : m.parentesco}</td>
            <td>{i === 0 ? `${c.nombres} ${c.apellidos}` : `Integrante adicional ${i}`}</td>
            <td>{m.edad} años</td>
            <td>{m.precio != null ? formatearPrecioARS(m.precio) : 'Pendiente de cálculo'}</td>
          </tr>)}
        </tbody>
        {resultado && <tfoot>
          <tr>
            <td colSpan="3">Suma Valor Base Total (Grupo Familiar)</td>
            <td>{formatearPrecioARS(resultado.precio_base)}</td>
          </tr>
        </tfoot>}
      </table>
    </div>
  </section>;
  return <div className={`ase-review-body${detail ? ' ase-detail-review' : ''}`}>
    <section className="ase-holder-card">
      <h3>{detail ? '' : '1. '}Datos del Titular y Asignación Comercial</h3>
      <dl className="ase-identity-grid">
        <div>
          <dt>Nombre y apellido</dt>
          <dd>{c.nombres} {c.apellidos}</dd>
        </div>
        <div>
          <dt>Documento Nacional</dt>
          <dd>DNI {c.dni}</dd>
        </div>
        <div>
          <dt>Edad utilizada</dt>
          <dd>{entrada.familia.titular.edad} años</dd>
        </div>
        <div>
          <dt>Ciudad / Localidad</dt>
          <dd>{[c.localidad, c.provincia].filter(Boolean).join(', ') || 'Sin registrar'}</dd>
        </div>
        <div>
          <dt>Contacto primario</dt>
          <dd>{contacto.email || 'Correo sin registrar'}<small>{contacto.telefono || 'Teléfono sin registrar'}</small></dd>
        </div>
        <div className="ase-advisor-card">
          <dt>Asesor responsable</dt>
          <dd>{asesor ? `${asesor.nombre ?? ''} ${asesor.apellido ?? ''}`.trim() : 'Según titularidad del registro'}{asesor?.legajo && <small>Legajo comercial: {asesor.legajo}</small>}</dd>
        </div>
      </dl>
    </section>
    <section className="ase-plan-cards">
      {!detail && <h3>2. Configuración del Plan de Salud</h3>}
      <div className="ase-plan-summary">
        <div>
          <small>Plan elegido</small>
          <strong>{solicitud.plan.nombre}</strong>
          <p className="ase-muted">Tarifa #{solicitud.referencias?.tarifa_version_id ?? resultado?.referencias?.tarifa_version_id ?? 'según snapshot'}</p>
        </div>
        <div>
          <small>Modalidad e ingreso</small>
          <strong>{entrada.modalidad}</strong>
          {entrada.aportes.sueldo_bruto && <p>Sueldo bruto informado: {formatearPrecioARS(entrada.aportes.sueldo_bruto)}</p>}
          {entrada.aportes.aporte_personal && <p>Aporte personal del recibo: {formatearPrecioARS(entrada.aportes.aporte_personal)}</p>}
          {entrada.aportes.categoria && <p>Categoría {entrada.aportes.categoria} · {entrada.aportes.adherentes} adherentes registrados</p>}
        </div>
        <div>
          <small>Aportes y cápitas</small>
          {resultado?.aportes.filter(a => Number(a.importe) > 0).map((a, i) =>
            <p className="ase-captured-contribution" key={i}>{a.concepto}: <strong>{formatearPrecioARS(a.importe)}</strong></p>
          )}
          {resultado && !resultado.aportes.some(a => Number(a.importe) > 0) && <p>Sin aportes aplicados</p>}
          <p><span className="ase-pill">{miembros.length} integrantes</span></p>
        </div>
      </div>
    </section>
    {!detail && familia}
    {resultado && <QuoteSummary resultado={resultado} detail={detail} />}
    {detail && <details className="ase-detail-extra">
      <summary>Grupo familiar · {miembros.length} integrantes · Ver edades e importes históricos</summary>
      {familia}
    </details>}
  </div>;
}
