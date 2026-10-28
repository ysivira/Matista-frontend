/**
 * ============================================================
 * MATISTA | REFERENCIA DE TARIFAS
 * ============================================================
 *
 * Archivo: PlanTariffPreview.jsx
 * Módulo: Asesor
 *
 * Responsabilidad:
 * Mostrar segmentos publicados del plan y modalidad sin calcular la tarifa familiar.
 *
 * CONTENIDO:
 * - Función PlanTariffPreview.
 *
 * DEPENDENCIAS:
 * - ../../../shared/lib/formatoMonetario.js
 * - ../hooks/useAsesorConsulta.js
 *
 * ============================================================
 */
import { formatearPrecioARS } from '../../../shared/lib/formatoMonetario.js';
import { useAsesorConsulta } from '../hooks/useAsesorConsulta.js';

/** Presenta precios publicados del plan seleccionado sin sumar integrantes ni calcular una tarifa familiar. */
export function PlanTariffPreview({
  planId,
  modalidad
}) {
  const tipoIngreso = modalidad === 'Monotributo' ? 'Obligatorio' : modalidad;
  const {
    data,
    error,
    loading
  } = useAsesorConsulta(`tarifario/planes/${encodeURIComponent(planId)}/${tipoIngreso}`);
  return <section>
    <h4>Lista vigente del plan seleccionado</h4>
    {loading && <p role="status">Consultando precios publicados...</p>}
    {error && <p role="alert">{error}</p>}
    {data && <><p>Versión #{data.version.id} · Lista {data.tipo_ingreso}. Precios de referencia por segmento; no constituyen un cálculo para esta familia.</p>
      <div className="ase-table">
        <table>
          <thead>
            <tr>
              <th>Segmento tarifario</th>
              <th>Precio publicado</th>
            </tr>
          </thead>
          <tbody>
            {data.tarifas.map(t => <tr key={t.rango_clave}>
              <td>{t.rango_etario}</td>
              <td>{formatearPrecioARS(t.precio)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </>}
  </section>;
}
