export const CAMPOS_POLITICA = Object.freeze([
  { grupo: 'Aportes y topes', name: 'porcentaje_aporte_reconocido', label: 'Aporte obra social', tipo: 'number', step: '0.01', min: '0.01', max: '99.99', sufijo: '%' },
  { grupo: 'Aportes y topes', name: 'tope_sueldo_bruto', label: 'Tope sueldo bruto', tipo: 'number', step: '0.01', min: '0.01', moneda: true },
  { grupo: 'Aportes y topes', name: 'aporte_monotributo', label: 'Aporte monotributo', tipo: 'number', step: '0.01', min: '0.01', moneda: true },
  { grupo: 'Aportes y topes', name: 'aporte_adherente', label: 'Aporte adherente', tipo: 'number', step: '0.01', min: '0', moneda: true, opcional: true },
  { grupo: 'Aportes y topes', name: 'iva_voluntario_pct', label: 'IVA Voluntario', tipo: 'number', step: '0.01', min: '0', max: '100', sufijo: '%', opcional: true },
  { grupo: 'Descuentos y promociones', name: 'joven_porcentaje', label: 'Descuento joven', tipo: 'number', step: '0.01', min: '0', max: '100', sufijo: '%' },
  { grupo: 'Descuentos y promociones', name: 'comercial_fijo_max_pct', label: 'Descuento fijo máx.', tipo: 'number', step: '0.01', min: '0.01', max: '100', sufijo: '%' },
  { grupo: 'Descuentos y promociones', name: 'comercial_fijo_meses_max', label: 'Duración máx. fijo', tipo: 'number', min: '1', max: '12', sufijo: ' meses' },
  { grupo: 'Descuentos y promociones', name: 'primer_tramo_50_meses_max', label: 'Primer tramo 50% máx.', tipo: 'number', min: '1', max: '12', sufijo: ' meses', help: 'Regla especial: cuando el primer tramo de una propuesta escalonada sea del 50%, debe durar exactamente 3 meses.' },
  { grupo: 'Esquema escalonado', name: 'comercial_escalonado_max_pct', label: 'Desc. escalonado máx.', tipo: 'number', step: '0.01', min: '0.01', max: '100', sufijo: '%' },
  { grupo: 'Esquema escalonado', name: 'comercial_escalonado_tramos_max', label: 'Tramos máx.', tipo: 'number', min: '1', max: '4' },
  { grupo: 'Esquema escalonado', name: 'comercial_escalonado_total_meses_max', label: 'Total meses máx.', tipo: 'number', min: '1', max: '12', sufijo: ' meses' },
  { grupo: 'TDC y afinidad', name: 'tdc_pct', label: 'Descuento TDC', tipo: 'number', step: '0.01', min: '0', max: '100', sufijo: '%' },
  { grupo: 'TDC y afinidad', name: 'tope_comercial_tdc_pct', label: 'Tope comercial, TDC y afinidad', tipo: 'number', step: '0.01', min: '0.01', max: '100', sufijo: '%' },
  { grupo: 'TDC y afinidad', name: 'afinidad_pct', label: 'Descuento afinidad', tipo: 'number', step: '0.01', min: '0', max: '100', sufijo: '%', opcional: true },
])

export const GRUPOS = [...new Set(CAMPOS_POLITICA.map((campo) => campo.grupo))]

/** Formatea un decimal como porcentaje con dos posiciones. */
export function formatearPorcentaje(valor) {
  return `${Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`
}

/** Presenta un valor de política con su unidad sin alterar el dato recibido. */
export function presentarValor(campo, politica) {
  const valor = politica?.[campo.name]
  if (valor === null || valor === undefined || valor === '') return '—'
  if (campo.moneda) {
    return `$ ${Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (campo.sufijo === '%') return formatearPorcentaje(valor)
  return `${valor}${campo.sufijo ?? ''}`
}

