/**
 * MATISTA - Frontend · Asesor comercial
 * Archivo: DiscountSelector.jsx
 *
 * RESPONSABILIDAD:
 * Componente DiscountSelector del módulo Asesor comercial; unidad de interfaz reutilizable de la
 * feature.
 *
 * CONTENIDO:
 * - Función DiscountSelector.
 *
 * DEPENDENCIAS:
 * - ../../../shared/catalogo/politicaPresentacion.js
 */
import { formatearPorcentaje } from '../../../shared/catalogo/politicaPresentacion.js';

/** Controles Stitch de campaña y adicionales; envía opciones de ADMIN, nunca importes calculados. */
export function DiscountSelector({
  value,
  onChange,
  politica,
  validacion
}) {
  const porcentajes = (politica.porcentajes_comerciales ?? []).filter(p => p.vigente_hasta == null);
  const fijo = value.esquema === 'FIJO' || !value.esquema && value.tramos.length <= 1;
  const errores = validacion?.errores ?? [];
  /** Obtiene el mensaje contextual devuelto por el servidor, sin volver a evaluar límites en React. */
  function mensaje(field) {
    return errores.filter(e => e.field === field).map(e => e.message).join(' ');
  }
  /** Mantiene el nombre accesible del control estable aunque aparezca feedback dentro de su etiqueta. */
  function atributosTramo(i, campo) {
    return {
      'aria-label': `${campo === 'meses' ? 'Meses' : 'Descuento'} tramo ${i + 1}`
    };
  }
  /** Confirma cambios con el servidor sin marcar campos vacíos que todavía no se utilizaron. */
  function confirmar(nuevo, campos = []) {
    onChange(nuevo);
    void validacion?.validar(nuevo, {
      campos
    });
  }
  /** Sustituye un tramo y valida el campo editado; el backend conserva todas las reglas. */
  function cambiar(indice, campo, valor) {
    const nuevo = {
      ...value,
      esquema: value.esquema ?? (fijo ? 'FIJO' : 'TRAMOS'),
      tramos: value.tramos.map((t, i) => i === indice ? {
        ...t,
        [campo]: valor
      } : t)
    };
    confirmar(nuevo, [`condiciones.tramos.${indice}.${campo}`]);
  }
  /** Revalida blur solo si el asesor ya modificó este control, no al atravesarlo intacto. */
  function abandonar(campo) {
    if (validacion?.utilizado(campo)) void validacion.validar(value, {
      campos: [campo]
    });
  }
  /** Cambia de esquema conservando la duración declarada; un tramo nuevo nunca recibe meses automáticos. */
  function esquema(esFijo) {
    if (esFijo && !value.tramos.length) validacion?.iniciarTramo?.(0);
    confirmar({
      ...value,
      esquema: esFijo ? 'FIJO' : 'TRAMOS',
      tramos: esFijo ? [{
        porcentaje_id: value.tramos[0]?.porcentaje_id ?? '',
        meses: value.tramos[0]?.meses ?? ''
      }] : value.tramos
    });
  }
  /** Añade un tramo sin duración ni porcentaje supuestos, conservando los anteriores. */
  function agregar() {
    validacion?.iniciarTramo?.(value.tramos.length);
    confirmar({
      ...value,
      esquema: 'TRAMOS',
      tramos: [...value.tramos, {
        porcentaje_id: '',
        meses: ''
      }]
    });
  }
  return <>
    <section tabIndex="-1" className={`ase-config-card ase-discounts${errores.length
      ? ' ase-section-invalid' : ''}`}
      data-section="condiciones">
      <div className="ase-card-title">
        <h3><b>4</b> Descuentos Comerciales de Campaña</h3>
        <small>Esquema excluyente</small>
      </div>
      <div className="ase-segments" role="group"
        aria-label="Esquema comercial">
        <button type="button" aria-pressed={!fijo}
          onClick={() => esquema(false)}>Descuento por tramos</button>
        <button type="button" aria-pressed={fijo} disabled={!porcentajes.length}
          onClick={() => esquema(true)}>Descuento fijo (hasta {politica.comercial_fijo_meses_max} meses)</button>
      </div>
      {!porcentajes.length
        && <p className="ase-notice">ADMIN aún no publicó porcentajes para esta política. Puede preparar sin descuento comercial.</p>}
      <div className="ase-discount-grid">
        {value.tramos.map((t, i) => <section className="ase-tramo"
          key={i}>
          <div>
            <strong>Tramo {i + 1}</strong>
            <button type="button"
            className="ase-icon-button ase-danger" aria-label={`Quitar tramo ${i + 1}`}
            onClick={() => confirmar({
                ...value,
                tramos: value.tramos.filter((_, n) => n !== i)
              })}>×</button>
          </div>
          <div className="ase-grid">
            <label>Descuento tramo {i + 1}<select {...atributosTramo(i, 'porcentaje_id')}
              data-comercial="true" data-field={`condiciones.tramos.${i}.porcentaje_id`} required
              aria-invalid={Boolean(mensaje(`condiciones.tramos.${i}.porcentaje_id`))}
              aria-describedby={`ase-pct-error-${i}`} value={t.porcentaje_id}
              onBlur={() => abandonar(`condiciones.tramos.${i}.porcentaje_id`)} onChange={e => cambiar(i,
              'porcentaje_id', e.target.value)}>
                <option value="">Seleccionar</option>
                {porcentajes.map(p => <option key={p.id}
                  value={p.id}>{formatearPorcentaje(p.porcentaje)}</option>)}
              </select><small id={`ase-pct-error-${i}`} className="ase-field-error">{mensaje(`condiciones.tramos.${i}.porcentaje_id`)}</small></label>
          <label>Meses tramo {i + 1}<input {...atributosTramo(i, 'meses')}
            data-comercial="true" data-field={`condiciones.tramos.${i}.meses`} required type="text"
            inputMode="numeric" pattern="[0-9]+" autoComplete="off"
            aria-invalid={Boolean(mensaje(`condiciones.tramos.${i}.meses`))}
            aria-describedby={`ase-meses-error-${i}`} value={t.meses}
            onBlur={() => abandonar(`condiciones.tramos.${i}.meses`)} onChange={e => cambiar(i, 'meses',
            /^\d+$/.test(e.target.value) ? Number(e.target.value) :
            e.target.value)} /><small id={`ase-meses-error-${i}`}
            className="ase-field-error">{mensaje(`condiciones.tramos.${i}.meses`)}</small></label>
          </div>
        </section>)}
      </div>
      {!fijo && <button type="button" aria-label="Agregar tramo consecutivo"
        className="ase-small-button" disabled={!porcentajes.length
        || value.tramos.length >= Number(politica.comercial_escalonado_tramos_max)}
        onClick={agregar}>+ Agregar tramo consecutivo</button>}
      {errores.length > 0 && <p role="alert"
        className="ase-field-error">Revise los campos señalados de la campaña. {mensaje('condiciones.tramos') || mensaje('condiciones.esquema') || mensaje('condiciones')}</p>}
      {validacion?.pendiente && <small role="status">Verificando política vigente…</small>}
      {validacion?.tecnico && <p role="alert"
        className="ase-technical-error">{validacion.tecnico}</p>}
      <small>Los límites de duración y acumulación corresponden a la política vigente del servidor.</small>
    </section>
    <section className={`ase-config-card${mensaje('condiciones.tdc')
      || mensaje('condiciones.beneficios.solicita_afinidad') ? ' ase-section-invalid' :
      ''}`}>
      <div className="ase-card-title">
        <h3><b>5</b> Descuentos Adicionales</h3>
        <small>Beneficios acumulables</small>
      </div>
      <div className="ase-benefit-grid">
      {Number(politica.tdc_habilitado) === 1 && Number(politica.tdc_pct) > 0
        && <label className="ase-benefit"><input data-comercial="true" data-field="condiciones.tdc"
        aria-invalid={Boolean(mensaje('condiciones.tdc'))} type="checkbox" checked={value.tdc}
        onChange={e => confirmar({
            ...value,
            tdc: e.target.checked
          })} /><span>Solicitar beneficio TDC ({formatearPorcentaje(politica.tdc_pct)})<small>Adhesión voluntaria con débito automático en tarjeta.</small><small className="ase-field-error">{mensaje('condiciones.tdc')}</small></span></label>}
      {Number(politica.afinidad_pct) > 0
        && <label className="ase-benefit"><input data-comercial="true"
        data-field="condiciones.beneficios.solicita_afinidad"
        aria-invalid={Boolean(mensaje('condiciones.beneficios.solicita_afinidad'))} type="checkbox"
        checked={value.beneficios.solicita_afinidad} onChange={e => confirmar({
            ...value,
            beneficios: {
              solicita_afinidad: e.target.checked
            }
          })} /><span>Aplicar afinidad ({formatearPorcentaje(politica.afinidad_pct)})<small>Convenio empresarial o colegio profesional.</small><small className="ase-field-error">{mensaje('condiciones.beneficios.solicita_afinidad')}</small></span></label>}
      <div className="ase-benefit ase-muted">Descuento Joven<small>El motor evalúa edad, estado civil, familia y política vigente. Solo se muestra como efectivo al calcular.</small></div>
      </div>
    </section>
  </>;
}
