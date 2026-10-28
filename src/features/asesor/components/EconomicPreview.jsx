/**
 * ============================================================
 * MATISTA | VISTA PREVIA ECONÓMICA
 * ============================================================
 *
 * Archivo: EconomicPreview.jsx
 * Módulo: Asesor
 *
 * Responsabilidad:
 * Consultar el cálculo efímero de entradas completas y descartar respuestas obsoletas.
 *
 * CONTENIDO:
 * - Función EconomicPreview.
 *
 * DEPENDENCIAS:
 * - react
 * - ../api/asesorApi.js
 * - ./QuoteSummary.jsx
 *
 * ============================================================
 */
import { useEffect, useState } from 'react';
import { guardarAsesor } from '../api/asesorApi.js';
import { QuoteSummary } from './QuoteSummary.jsx';

/** Previsualiza entradas completas sin persistir; omite adherentes en edición inválida y descarta respuestas obsoletas. */
export function EconomicPreview({
  entrada,
  onResult,
  errorExterno
}) {
  const clave = JSON.stringify(entrada);
  const [estado, setEstado] = useState(null);
  const completa = Boolean(
    entrada.cliente_id
    && entrada.plan_id
    && Number.isInteger(entrada.familia.titular.edad)
    && entrada.familia.miembros.every(m => Number.isInteger(m.edad))
    && entrada.condiciones.tramos.every(t =>
      t.porcentaje_id && Number.isInteger(t.meses) && t.meses > 0
    )
    && (entrada.modalidad !== 'Monotributo'
      || Number.isSafeInteger(entrada.aportes.adherentes) && entrada.aportes.adherentes >= 0
      && entrada.aportes.categoria)
  );
  useEffect(() => {
    if (!completa) return undefined;
    let vigente = true;
    const timer = setTimeout(() => {
      guardarAsesor('cotizaciones/previsualizacion', JSON.parse(clave)).then(r => {
        if (vigente) {
          setEstado({
            clave,
            resultado: r.resultado
          });
          onResult?.({
            clave,
            resultado: r.resultado
          });
        }
      }, error => {
        if (vigente) setEstado({
          clave,
          error: error.message
        });
      });
    }, 350);
    return () => {
      vigente = false;
      clearTimeout(timer);
    };
  }, [clave, completa, onResult]);
  return <aside className="ase-preview" aria-label="Vista previa económica" aria-live="polite">
    {errorExterno && <p role="alert" className="ase-technical-error">{errorExterno}</p>}
    {!completa ? <>
      <h3>Vista Previa Económica</h3>
      <p>Complete plan, grupo familiar y condiciones para obtener un cálculo real.</p>
    </> : estado?.clave !== clave ? <>
      <h3>Vista Previa Económica</h3>
      <p role="status">Calculando valores vigentes…</p>
    </> : estado.error ? <>
      <h3>Vista Previa Económica</h3>
      <p role="alert">{estado.error}</p>
    </> : <QuoteSummary resultado={estado.resultado} compact />}
  </aside>;
}
