/**
 * ============================================================
 * MATISTA | PRUEBAS DE LÍMITES DE MÓDULOS
 * ============================================================
 *
 * Archivo: arquitecturaCompartida.test.js
 * Módulo: Pruebas de arquitectura
 *
 * Responsabilidad:
 * Inspeccionar imports locales y verificar límites entre módulos,
 * destinos existentes y ausencia de ciclos estáticos de archivos.
 *
 * ============================================================
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { cwd } from 'node:process'

const raiz = resolve(cwd(), 'src')

/**
 * Obtiene imports y reexportaciones locales de fuentes JS/JSX para comprobar límites sin ejecutar APIs.
 * @param {string} directorio Directorio de fuentes a recorrer.
 * @returns {Map<string, string[]>} Archivos con sus destinos locales resueltos.
 */
function grafoLocal(directorio) {
  const grafo = new Map()
  for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
    const archivo = resolve(directorio, entrada.name)
    if (entrada.isDirectory()) {
      for (const [ruta, dependencias] of grafoLocal(archivo)) grafo.set(ruta, dependencias)
    } else if (/\.(js|jsx)$/.test(entrada.name)) {
      const codigo = readFileSync(archivo, 'utf8')
      const imports = [...codigo.matchAll(/(?:\bfrom\s*|\bimport\s*)(['"])([^'"\n]+)\1/g)]
      grafo.set(archivo, imports.filter(m => m[2].startsWith('.')).map(m => resolve(dirname(archivo), m[2])))
    }
  }
  return grafo
}

describe('ARCH15 límites de componentes compartidos', () => {
  it('shared no importa implementaciones de features ni de la composición app', () => {
    for (const [archivo, destinos] of grafoLocal(raiz)) {
      if (!relative(raiz, archivo).startsWith('shared/')) continue
      for (const destino of destinos) expect(relative(raiz, destino)).not.toMatch(/^(features|app)\//)
    }
  })

  it('ADMIN, ASESOR y PERFIL no importan sus implementaciones internas entre sí ni app', () => {
    for (const [archivo, destinos] of grafoLocal(raiz)) {
      const propia = relative(raiz, archivo).match(/^features\/(admin|asesor|perfil)\//)?.[1]
      if (!propia) continue
      for (const destino of destinos) {
        const ruta = relative(raiz, destino)
        const otra = ruta.match(/^features\/(admin|asesor|perfil)\//)?.[1]
        expect(ruta).not.toMatch(/^app\//)
        if (otra) expect(otra).toBe(propia)
      }
    }
  })

  it('todos los destinos locales existen y el grafo estático no contiene ciclos de archivos', () => {
    const grafo = grafoLocal(raiz)
    const visitados = new Set()
    const activos = new Set()
    /**
     * Recorre un archivo y rechaza ciclos en la pila, sin confundir reutilización con dependencia circular.
     * @param {string} archivo Archivo fuente o recurso importado.
     */
    function visitar(archivo) {
      expect(existsSync(archivo), archivo).toBe(true)
      expect(activos.has(archivo), archivo).toBe(false)
      if (visitados.has(archivo)) return
      activos.add(archivo)
      for (const destino of grafo.get(archivo) ?? []) visitar(destino)
      activos.delete(archivo)
      visitados.add(archivo)
    }
    for (const archivo of grafo.keys()) visitar(archivo)
  })
})
