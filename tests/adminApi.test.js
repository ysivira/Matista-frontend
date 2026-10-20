import { describe, expect, it, vi } from 'vitest'
import { createAdminApi } from '../src/features/admin/api/adminApi.js'

/** Cliente HTTP capturador de rutas para verificar los DTO del directorio. */
function capturador(respuesta = null) {
  const llamadas = []
  return {
    llamadas,
    async request(ruta, opciones = {}) {
      llamadas.push({ ruta, opciones })
      return respuesta
    },
  }
}

describe('adminApi (SL-1)', () => {
  it('lista empleados con filtros válidos y omite los valores "todos"', async () => {
    const client = capturador()
    const api = createAdminApi(client)

    await api.listEmployees({ estado: 'ACTIVO', rol: 'todos', busqueda: '  ana  ' })
    expect(client.llamadas[0].ruta).toBe('/api/admin/employees?estado=ACTIVO&busqueda=ana')
    expect(client.llamadas[0].opciones.method).toBeUndefined()

    await api.listEmployees()
    expect(client.llamadas[1].ruta).toBe('/api/admin/employees')

    await api.listEmployees({ estado: 'todos', rol: 'ADMIN', busqueda: '   ' })
    expect(client.llamadas[2].ruta).toBe('/api/admin/employees?rol=ADMIN')
  })

  it('usa el DTO exacto y método PATCH para estado y rol', async () => {
    const client = capturador()
    const api = createAdminApi(client)

    await api.getEmployee('0000000002')
    expect(client.llamadas[0].ruta).toBe('/api/admin/employees/0000000002')

    await api.changeEstado('0000000002', 'INACTIVO')
    expect(client.llamadas[1]).toEqual({
      ruta: '/api/admin/employees/0000000002/estado',
      opciones: { method: 'PATCH', body: { estado: 'INACTIVO' } },
    })

    await api.changeRol('0000000002', 'ADMIN')
    expect(client.llamadas[2]).toEqual({
      ruta: '/api/admin/employees/0000000002/rol',
      opciones: { method: 'PATCH', body: { rol: 'ADMIN' } },
    })
  })
})

describe('adminApi consulta SL-2', () => {
  it('lista planes con la ruta canónica sin cuerpo extra', async () => {
    const client = capturador({ planes: [] })
    const api = createAdminApi(client)

    await api.listarPlanes()
    expect(client.llamadas[0]).toEqual({ ruta: '/api/admin/planes', opciones: {} })
  })

  it('consulta el tarifario con planId y modalidad exacta en el segmento URL', async () => {
    const client = capturador()
    const api = createAdminApi(client)

    await api.consultarTarifario(2, 'Voluntario')
    expect(client.llamadas[0]).toEqual({ ruta: '/api/admin/tarifario/planes/2/Voluntario', opciones: {} })

    await api.consultarTarifario('4', 'Obligatorio')
    expect(client.llamadas[1].ruta).toBe('/api/admin/tarifario/planes/4/Obligatorio')
  })
})

/** Sección mínima para la vista de perfil: se reutiliza authApi simulado. */
vi.mock('../src/features/auth/api/authApi.js', () => ({
  authApi: { changePassword: vi.fn(), changeEmail: vi.fn() },
}))
