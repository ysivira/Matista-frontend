import { describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  createHttpClient,
  NetworkError,
} from '../src/shared/lib/httpClient.js'

/**
 * Construye una respuesta JSON real para probar el parser del cliente.
 * @param {unknown} body Cuerpo serializable.
 * @param {number} [status] Estado HTTP.
 * @returns {Response} Respuesta compatible con fetch.
 */
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('httpClient', () => {
  it('incluye credenciales y serializa cuerpos JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ code: 'OK' }))
    const client = createHttpClient({
      baseUrl: 'http://localhost:3000/',
      fetchImpl: fetchMock,
    })

    const result = await client.request('/api/auth/login', {
      method: 'POST',
      body: { email: 'asesor@example.test', password: 'secreto' },
    })

    expect(result).toEqual({ code: 'OK' })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'asesor@example.test', password: 'secreto' }),
      }),
    )
    const options = fetchMock.mock.calls[0][1]
    expect(options.headers.get('Content-Type')).toBe('application/json')
  })

  it('devuelve null para respuestas sin contenido', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    const client = createHttpClient({ fetchImpl: fetchMock })

    await expect(client.request('/api/auth/logout', { method: 'POST' })).resolves.toBeNull()
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
  })

  it('conserva código, mensaje y detalles del error contractual', async () => {
    const details = [{ field: 'email', message: 'Ingrese un correo válido.' }]
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'La solicitud contiene datos inválidos.',
        details,
      },
    }, 400))
    const client = createHttpClient({ fetchImpl: fetchMock })

    await expect(client.request('/api/auth/register', { method: 'POST', body: {} }))
      .rejects.toMatchObject({
        name: 'ApiError',
        status: 400,
        code: 'VALIDATION_FAILED',
        details,
      })
  })

  it('no inventa un código cuando la respuesta no sigue el contrato', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: 'fallo' }, 500))
    const client = createHttpClient({ fetchImpl: fetchMock })

    try {
      await client.request('/api/auth/me')
      throw new Error('La solicitud debía fallar.')
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.code).toBeUndefined()
      expect(error.status).toBe(500)
    }
  })

  it('distingue fallos de red de errores HTTP', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    const client = createHttpClient({ fetchImpl: fetchMock })

    await expect(client.request('/api/auth/me')).rejects.toBeInstanceOf(NetworkError)
  })

  it('normaliza un fallo de transporte durante la lectura del cuerpo', async () => {
    const interruptedResponse = {
      ok: true,
      status: 200,
      text: () => Promise.reject(new TypeError('conexión interrumpida')),
    }
    const fetchMock = vi.fn().mockResolvedValue(interruptedResponse)
    const client = createHttpClient({ fetchImpl: fetchMock })

    await expect(client.request('/api/auth/me')).rejects.toBeInstanceOf(NetworkError)
  })

  it('conserva un error contractual aunque la lectura del cuerpo forme parte del mismo flujo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas.' },
    }, 401))
    const client = createHttpClient({ fetchImpl: fetchMock })

    await expect(client.request('/api/auth/login', {
      method: 'POST',
      body: { email: 'asesor@example.test', password: 'secreto' },
    })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      code: 'INVALID_CREDENTIALS',
    })
  })
})
