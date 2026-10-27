/**
 * MATISTA - Frontend · Asesor comercial
 * Archivo: QuoteHistory.jsx
 *
 * RESPONSABILIDAD:
 * Página QuoteHistory del módulo Asesor comercial; compone componentes de la feature para su caso
 * de uso.
 *
 * CONTENIDO:
 * - Función QuoteHistory.
 *
 * DEPENDENCIAS:
 * - react
 * - react-router-dom
 * - ../hooks/useAsesorConsulta.js
 * - ../../../shared/lib/formatoMonetario.js
 * - ../stitch.css
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsesorConsulta } from '../hooks/useAsesorConsulta.js';
import { formatearPrecioARS } from '../../../shared/lib/formatoMonetario.js';
import '../stitch.css';

/** Presenta total y aportes históricos de Monotributo sin volver a calcularlos ni cambiar otros regímenes. */
function ImporteHistorico({
  cotizacion
}) {
  return <>{cotizacion.total != null ? formatearPrecioARS(cotizacion.total) : 'Sin cálculo'}
    {cotizacion.modalidad === 'Monotributo'
      && cotizacion.aportes?.filter(a => Number(a.importe) > 0).map((a,
      i) => <small className="ase-mono-aporte"
      key={i}>Aporte {a.concepto}: − {formatearPrecioARS(a.importe)}</small>)}
  </>;
}

/** Historial Stitch: filtros reales, importes del snapshot y paginación sin inventar totales globales. */
export function QuoteHistory() {
  const [filtro, setFiltro] = useState({
    cliente: '',
    estado: '',
    plan: '',
    desde: '',
    hasta: ''
  });
  const [pagina, setPagina] = useState(1);
  const [filas, setFilas] = useState(10);
  const servidor = Math.floor((pagina - 1) * filas / 50) + 1;
  const {
    data,
    error,
    loading
  } = useAsesorConsulta(`cotizaciones?${new URLSearchParams({
    ...filtro,
    pagina: servidor
  })}`);
  const planes = useAsesorConsulta('planes');
  const offset = (pagina - 1) * filas % 50;
  const resultados = data?.cotizaciones ?? [];
  const visibles = resultados.slice(offset, offset + filas);
  /** Cambia el filtro y retorna al inicio para no ocultar coincidencias en páginas anteriores. */
  function cambiar(campo, valor) {
    setFiltro(actual => ({
      ...actual,
      [campo]: valor
    }));
    setPagina(1);
  }
  return <div className="ase-ui">
    <header className="ase-local-heading">
      <div>
        <p>● PORTAL ASESOR • CARTERA ACTIVA</p>
        <h1>Mis Cotizaciones</h1>
        <p>Consultá y gestioná tus cotizaciones comerciales emitidas y en seguimiento con cálculo actuarial automatizado.</p>
      </div>
      <Link className="ase-primary-link" to="/asesor/nueva">+ Nueva Cotización</Link>
    </header>
    <section className="ase-filter-bar" aria-label="Filtros del historial">
      <label className="ase-search-filter">Buscar por cliente, DNI o número<input
        type="search"
        maxLength="100"
        placeholder="Buscar por cliente, DNI o número de cotización…"
        value={filtro.cliente}
        onChange={e => cambiar('cliente', e.target.value)}
      /></label>
      <label>Desde<input type="date" value={filtro.desde} onChange={e => cambiar('desde', e.target.value)} /></label>
      <label>Hasta<input type="date" value={filtro.hasta} onChange={e => cambiar('hasta', e.target.value)} /></label>
      <label>Plan<select value={filtro.plan} onChange={e => cambiar('plan', e.target.value)}>
        <option value="">Todos los planes</option>
        {planes.data?.planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select></label>
      <label>Estado<select value={filtro.estado} onChange={e => cambiar('estado', e.target.value)}>
        <option value="">Todos los estados</option>
        {['BORRADOR', 'EMITIDA', 'ANULADA'].map(e => <option key={e}>{e}</option>)}
      </select></label>
      <button type="button" className="ase-secondary" onClick={() => {
        setFiltro({
          cliente: '',
          estado: '',
          plan: '',
          desde: '',
          hasta: ''
        });
        setPagina(1);
      }}>Limpiar filtros</button>
    </section>
    {loading && <p role="status">Cargando historial…</p>}
    {(error || planes.error)
      && <p role="alert">{error || planes.error}</p>}
    <section className="ase-history-surface">
      <div className="ase-table">
        <table>
          <thead>
            <tr>
              {['Número', 'Fecha', 'Cliente', 'DNI', 'Plan', 'Modalidad', 'Importe', 'Estado', 'Acciones'].map(t =>
                <th key={t}>{t}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {!loading && visibles.map(q => <tr key={q.id} className={q.estado === 'ANULADA' ? 'ase-annulled' : ''}>
              <td>
                <Link className="ase-reference" to={`/asesor/cotizaciones/${q.id}`}>{q.numero ?? `Borrador #${q.id}`}</Link>
                {q.origen_id && <small>Origen #{q.origen_id}</small>}
              </td>
              <td>{new Date(q.created_at).toLocaleDateString('es-AR')}</td>
              <td>{q.nombres} {q.apellidos}</td>
              <td>{q.dni}</td>
              <td><span className="ase-pill">{q.plan_nombre}</span></td>
              <td>{q.modalidad}</td>
              <td className="ase-number"><ImporteHistorico cotizacion={q} /></td>
              <td><span className={`ase-state ase-state--${q.estado.toLowerCase()}`}>{q.estado}</span></td>
              <td>
                <div className="ase-row-actions">
                  <Link aria-label="Ver detalle" title="Ver detalle" to={`/asesor/cotizaciones/${q.id}`}>
                    <span className="ase-symbol" aria-hidden="true">visibility</span>
                  </Link>
                  {q.estado === 'BORRADOR' && <Link
                    aria-label="Editar preparación"
                    title="Editar preparación"
                    to={`/asesor/cotizaciones/${q.id}/preparacion`}
                  ><span className="ase-symbol" aria-hidden="true">edit</span></Link>}
                  {q.estado !== 'ANULADA' && <Link
                    aria-label="Recotizar"
                    title="Recotizar"
                    to={`/asesor/cotizaciones/${q.id}/recotizar`}
                  ><span className="ase-symbol" aria-hidden="true">autorenew</span></Link>}
                  {q.numero && q.estado !== 'ANULADA' && <a
                    aria-label="Descargar PDF"
                    title="Descargar PDF"
                    href={`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/asesor/cotizaciones/${q.id}/pdf`}
                  ><span className="ase-symbol" aria-hidden="true">picture_as_pdf</span></a>}
                  {q.estado !== 'ANULADA' && <Link
                    aria-label="Anular desde detalle"
                    title="Anular desde detalle"
                    to={`/asesor/cotizaciones/${q.id}`}
                  ><span className="ase-symbol" aria-hidden="true">delete</span></Link>}
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {!loading && !visibles.length
        && <p className="ase-empty">No hay cotizaciones para los filtros elegidos.</p>}
      <footer className="ase-history-footer">
        <span>Mostrando {visibles.length ? (pagina - 1) * filas + 1 : 0}–{(pagina - 1) * filas + visibles.length}</span>
        <label>Filas por página<select value={filas} onChange={e => {
            setFilas(Number(e.target.value));
            setPagina(1);
          }}>
          {[5, 10, 25, 50].map(n => <option key={n}>{n}</option>)}
        </select></label>
        <div>
          <button className="ase-secondary"
            disabled={pagina === 1 || loading}
            onClick={() => setPagina(p => p - 1)}>Anterior</button>
          <span>Página {pagina}</span>
          <button
            className="ase-secondary"
            disabled={loading || offset + filas >= resultados.length && resultados.length < 50}
            onClick={() => setPagina(p => p + 1)}
          >Siguiente</button>
        </div>
      </footer>
    </section>
  </div>;
}
