/**
 * Indica si un borrador registra cambios económicos aún reversibles,
 * espejando la semántica del scanner del backend (ultimoCambioEconomico):
 * reconstruye cronológicamente una pila de operaciones y quita una entrada
 * por cada deshacer. Así conserva una edición anterior cuando se deshacen
 * cambios consecutivos sobre la misma tarifa. La pantalla solo usa esto para habilitar/deshabilitar
 * el botón «Deshacer último cambio» y no enviar pedidos innecesarios; el
 * backend conserva la autoridad y vuelve a validar cada pedido.
 * @param {object[]|null} eventos Eventos del resumen de auditoría (los más recientes primero).
 * @returns {boolean} true cuando hay al menos un cambio económico reversible.
 */
export function hayCambiosReversibles(eventos) {
  if (!Array.isArray(eventos)) return false
  const operacionesVigentes = []
  const gruposRegistrados = new Set()

  for (const evento of eventos.toReversed()) {
    if (typeof evento.detalle === 'string' && evento.detalle.startsWith('DESHACE')) {
      if (evento.tipo_operacion === 'AUMENTO_MASIVO'
        || (evento.tipo_operacion === 'PRECIO' && !evento.agrupador)) {
        operacionesVigentes.pop()
      }
      continue
    }
    if (evento.tipo_operacion !== 'PRECIO') continue
    if (!evento.agrupador) {
      operacionesVigentes.push(evento)
      continue
    }
    const agrupador = String(evento.agrupador)
    if (!gruposRegistrados.has(agrupador)) {
      gruposRegistrados.add(agrupador)
      operacionesVigentes.push(evento)
    }
  }
  return operacionesVigentes.length > 0
}
