import { formatearPrecioARS } from '../../../shared/lib/formatoMonetario.js'

/** Presenta conceptos capturados sin fórmulas; el detalle separa liquidación e importe destacado en dos columnas. */
export function QuoteSummary({ resultado, compact = false, detail = false }) {
  const primero = resultado.tramos[0]
  const beneficios = resultado.beneficios.filter(b => Number(b.porcentaje) > 0 && Number(b.importe) > 0)
  return <section className={`ase-economics${compact ? ' ase-economics--compact' : ''}${detail ? ' ase-economics--detail' : ''}`}>
    <div className="ase-economic-breakdown"><div className="ase-card-title"><h3>{compact ? 'Vista Previa Económica' : detail ? 'Desglose Económico Liquidado' : '4. Desglose Económico de Liquidación'}</h3><span className="ase-pill">Meses {primero.desde_mes} a {primero.hasta_mes}</span></div><p className="ase-muted">Primer período presupuestado</p>
    <dl className="ase-money-list"><div><dt>Valor del plan</dt><dd>{formatearPrecioARS(resultado.precio_base)}</dd></div>
      {beneficios.map((b, i) => <div key={`b-${i}`} className="ase-discount-line"><dt>Descuento {b.concepto} ({Number(b.porcentaje).toLocaleString('es-AR')} %)</dt><dd>− {formatearPrecioARS(b.importe)}</dd></div>)}
      {resultado.aportes.filter(a => Number(a.importe) > 0).map((a, i) => <div className="ase-aporte-line" key={`a-${i}`}><dt>Aporte {a.concepto}</dt><dd>− {formatearPrecioARS(a.importe)}</dd></div>)}
      {resultado.impuestos?.filter(b => Number(b.importe) > 0).map((b, i) => <div key={`i-${i}`}><dt>{b.concepto.startsWith('IVA') ? 'IVA' : b.concepto} ({Number(b.porcentaje).toLocaleString('es-AR')} %)</dt><dd>{formatearPrecioARS(b.importe)}</dd></div>)}
    </dl></div><div className="ase-economic-feature"><div className="ase-total"><div><strong>Total Inicial Estimado (1° Tramo)</strong><small>Cuota final por mes durante el primer período</small></div><strong>{formatearPrecioARS(resultado.total)}</strong></div>
    <h3>{compact || detail ? 'Descuentos Comerciales Pactados' : '5. Descuentos Comerciales Pactados'}</h3><div className="ase-period-grid">{resultado.tramos.map((t, i) => Number(t.porcentaje_comercial) > 0 ? <div className="ase-period" key={i}><small>Meses {t.desde_mes} a {t.hasta_mes}</small><strong>{Number(t.porcentaje_comercial).toLocaleString('es-AR')}% OFF</strong><small>{i === 0 ? 'Tramo activo inicial' : 'Condición futura pactada'}</small></div> : null)}</div>
    {!resultado.tramos.some(t => Number(t.porcentaje_comercial) > 0) && <p className="ase-muted">Sin descuento comercial pactado.</p>}
    <p className="ase-summary-muted">Los importes pueden variar por los aumentos autorizados que correspondan, respetando los porcentajes comerciales pactados durante su vigencia. El importe inicial no es un precio garantizado por doce meses.</p>
    </div>{!compact && !detail && resultado.advertencias.map((a, i) => <p className="ase-summary-muted" key={i}>{a}</p>)}
    {detail && resultado.advertencias.length > 0 && <details className="ase-detail-extra"><summary>Observaciones del resultado histórico</summary>{resultado.advertencias.map((a, i) => <p className="ase-summary-muted" key={i}>{a}</p>)}</details>}
  </section>
}
