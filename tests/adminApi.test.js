/**
 * ============================================================
 * MATISTA | PRUEBAS DEL CLIENTE ADMIN
 * ============================================================
 *
 * Archivo: adminApi.test.js
 * Módulo: Pruebas administrativas
 *
 * Responsabilidad:
 * Capturar rutas, métodos, filtros y DTO del directorio y
 * tarifario mediante un cliente HTTP simulado.
 *
 * ============================================================
 */
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

describe('adminApi consultas SL-3', () => {
  it('lista el historial y obtiene cabecera y snapshot por versión', async () => {
    const client = capturador()
    const api = createAdminApi(client)

    await api.listarVersiones()
    expect(client.llamadas[0]).toEqual({ ruta: '/api/admin/tarifario/versiones', opciones: {} })

    await api.obtenerVersion('7')
    expect(client.llamadas[1]).toEqual({ ruta: '/api/admin/tarifario/versiones/7', opciones: {} })

    await api.listarTarifasVersion('7')
    expect(client.llamadas[2]).toEqual({ ruta: '/api/admin/tarifario/versiones/7/tarifas', opciones: {} })
  })
})

describe('adminApi ciclo de edición SL-4/SL-5', () => {
  it('crea borrador y activa versión con cuerpo vacío por el contrato JSON', async () => {
    const client = capturador()
    const api = createAdminApi(client)

    await api.crearBorradorTarifario()
    expect(client.llamadas[0]).toEqual({
      ruta: '/api/admin/tarifario/versiones',
      opciones: { method: 'POST', body: {} },
    })

    await api.activarVersion('7')
    expect(client.llamadas[1]).toEqual({
      ruta: '/api/admin/tarifario/versiones/7/activacion',
      opciones: { method: 'POST', body: {} },
    })
  })

  it('envía el DTO exacto del aumento masivo con modalidad opcional', async () => {
    const client = capturador()
    const api = createAdminApi(client)

    await api.aumentarVersion('7', { porcentaje: '5', revision: '0' })
    expect(client.llamadas[0]).toEqual({
      ruta: '/api/admin/tarifario/versiones/7/aumentos',
      opciones: { method: 'POST', body: { porcentaje: '5', revision: '0' } },
    })

    await api.aumentarVersion('7', { porcentaje: '5', tipoIngreso: 'Voluntario', revision: '1' })
    expect(client.llamadas[1].opciones.body).toEqual({
      porcentaje: '5', tipoIngreso: 'Voluntario', revision: '1',
    })
  })

  it('solicita la previsualización del aumento como GET de solo lectura con query', async () => {
    const client = capturador()
    const api = createAdminApi(client)

    await api.previsualizarAumentoVersion('7', { porcentaje: '5' })
    await api.previsualizarAumentoVersion('7', { porcentaje: '7.77', tipoIngreso: 'Voluntario' })

    expect(client.llamadas[0]).toEqual({
      ruta: '/api/admin/tarifario/versiones/7/aumentos/vista-previa?porcentaje=5',
      opciones: {},
    })
    expect(client.llamadas[1]).toEqual({
      ruta: '/api/admin/tarifario/versiones/7/aumentos/vista-previa?porcentaje=7.77&tipoIngreso=Voluntario',
      opciones: {},
    })
  })

  it('edita precio individual con PATCH en el segmento de tarifa', async () => {
    const client = capturador()
    const api = createAdminApi(client)

    await api.editarPrecioTarifa('7', '201', { precio: '120.50', revision: '1' })
    expect(client.llamadas[0]).toEqual({
      ruta: '/api/admin/tarifario/versiones/7/tarifas/201',
      opciones: { method: 'PATCH', body: { precio: '120.50', revision: '1' } },
    })
  })

  it('finaliza la edición con la revisión optimista del borrador', async () => {
    const client = capturador()
    const api = createAdminApi(client)

    await api.finalizarVersion('7', { revision: '2' })
    expect(client.llamadas[0]).toEqual({
      ruta: '/api/admin/tarifario/versiones/7/finalizacion',
      opciones: { method: 'POST', body: { revision: '2' } },
    })
  })
})
