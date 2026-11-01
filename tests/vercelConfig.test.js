/**
 * MATISTA | PRUEBAS DE CONFIGURACIÓN DE DESPLIEGUE
 * Comprueba el orden del proxy y el fallback sin contactar servicios externos.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { describe, expect, it } from 'vitest'

const config = JSON.parse(readFileSync(resolve(cwd(), 'vercel.json'), 'utf8'))

describe('configuración de Vercel', () => {
  it('prioriza el proxy de API al backend HTTPS conservando el prefijo /api', () => {
    expect(config.rewrites[0]).toEqual({
      source: '/api/:path*',
      destination: 'https://matista-backend.vercel.app/api/:path*',
    })
  })

  it('coloca el fallback SPA después del proxy de API', () => {
    expect(config.rewrites).toHaveLength(2)
    expect(config.rewrites[1]).toEqual({ source: '/(.*)', destination: '/index.html' })
  })
})
