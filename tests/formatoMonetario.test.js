/**
 * ============================================================
 * MATISTA | PRUEBAS DE FORMATO MONETARIO
 * ============================================================
 *
 * Archivo: formatoMonetario.test.js
 * Módulo: Pruebas de utilidades
 *
 * Responsabilidad:
 * Verificar separadores, decimales, valores ausentes y conservación
 * de cadenas recibidas sin introducir redondeo económico.
 *
 * ============================================================
 */
import { describe, expect, it } from 'vitest'
import { formatearPrecioARS } from '../src/features/admin/components/formatoMonetario.js'

describe('formatearPrecioARS (SL-2E)', () => {
  it('mantiene el cero real con dos decimales exactos', () => {
    expect(formatearPrecioARS('0.00')).toBe('$ 0,00')
  })

  it('formatea importes de seis cifras con miles punto y coma decimal', () => {
    expect(formatearPrecioARS('404808.93')).toBe('$ 404.808,93')
  })

  it('formatea importes de siete cifras preservando los dos decimales', () => {
    expect(formatearPrecioARS('1299008.41')).toBe('$ 1.299.008,41')
    expect(formatearPrecioARS('7036782.40')).toBe('$ 7.036.782,40')
  })

  it('completa a dos decimales sin redondear valores truncados', () => {
    expect(formatearPrecioARS('5')).toBe('$ 5,00')
    expect(formatearPrecioARS('0.5')).toBe('$ 0,50')
  })

  it('no altera la cadena original entregada por la API', () => {
    const precio = '404808.93'
    formatearPrecioARS(precio)
    expect(precio).toBe('404808.93')
  })

  it('trunca sin redondear si el backend entregara más de dos decimales', () => {
    // Fuera de contrato (DECIMAL(12,2) entrega dos); el recorte nunca redondea.
    expect(formatearPrecioARS('10.005')).toBe('$ 10,00')
  })

  it('devuelve el guion em al recibir valores que faltan o son invalidos', () => {
    const invalidos = ['abc', '', '12,50', '1.2.3', null, undefined, 404808.93]
    const salidas = invalidos.map((valor) => formatearPrecioARS(valor))
    expect(salidas).toEqual(Array.from({ length: invalidos.length }, () => '—'))
  })
})
