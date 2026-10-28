/**
 * ============================================================
 * MATISTA | PRUEBAS DE EDAD CIVIL
 * ============================================================
 *
 * Archivo: edad.test.js
 * Módulo: Pruebas de utilidades
 *
 * Responsabilidad:
 * Verificar cumpleaños, calendario y fechas imposibles o futuras
 * con referencias UTC explícitas compatibles con el backend.
 *
 * ============================================================
 */
import { describe, expect, it } from 'vitest'
import { calcularEdad } from '../src/shared/lib/edad.js'

describe('edad civil con referencia UTC compartida con backend', () => {
  it.each([
    ['2000-10-24', '2026-10-24T00:00:00Z', 26],
    ['2000-10-25', '2026-10-24T23:59:59Z', 25],
    ['2000-10-23', '2026-10-24T12:00:00Z', 26],
    ['2000-02-29', '2025-02-28T12:00:00Z', 24],
    ['2000-02-29', '2025-03-01T00:00:00Z', 25],
    ['2000-02-29', '2024-02-29T00:00:00Z', 24],
    ['2026-10-25', '2026-10-24T12:00:00Z', null],
    ['2001-02-29', '2026-10-24T12:00:00Z', null],
    ['2000-04-31', '2026-10-24T12:00:00Z', null],
    ['2000-13-01', '2026-10-24T12:00:00Z', null],
    [null, '2026-10-24T12:00:00Z', null],
    ['2026-10-24', '2026-10-23T23:30:00-03:00', 0],
  ])('nacimiento %s a fecha %s = %s', (fecha, referencia, esperado) => {
    expect(calcularEdad(fecha, new Date(referencia))).toBe(esperado)
  })
})
