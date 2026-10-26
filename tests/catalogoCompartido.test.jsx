import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { RouterProvider } from 'react-router-dom'
import { createMemoryAppRouter } from '../src/app/router.jsx'
import { SessionContext } from '../src/features/auth/context/SessionContext.js'
import { httpClient, ApiError } from '../src/shared/lib/httpClient.js'
import { catalogoApi } from '../src/shared/api/catalogoApi.js'
import { asesorCatalogoApi } from '../src/features/asesor/api/asesorApi.js'
import { catalogoApi as catalogoAnterior } from '../src/features/admin/api/catalogoApi.js'
import { Avatar } from '../src/shared/ui/Avatar.jsx'
import { AdminAvatar } from '../src/features/admin/components/AdminAvatar.jsx'
import { Modal } from '../src/shared/ui/Modal.jsx'
import { AdminModal } from '../src/features/admin/components/AdminModal.jsx'

const planes = [{ id: 1, nombre: 'RUBÍ', detalles: 'Consulta|100%|Sin cargo', condiciones_generales: 'Condición sintética.' }]

/**
 * Monta las rutas reales con identidad ficticia e intercepta API; no inicia sesión ni modifica datos reales.
 * @param {string} rol Rol permitido o rechazado por el guard real.
 * @param {string} ruta Ruta inicial en memoria.
 * @returns {object} Router y espía del único cliente HTTP.
 */
function montar(rol, ruta) {
  const request = vi.spyOn(httpClient, 'request').mockImplementation(async path => {
    if (path.endsWith('/planes')) return { planes }
    if (path.includes('/tarifario/planes/')) return { plan: planes[0], tipo_ingreso: path.split('/').at(-1),
      version: { id: '8', estado: 'ACTIVA' }, tarifas: [{ rango_clave: '26-35', rango_etario: '26-35', precio: '200000.00' }] }
    throw new Error(`Petición de prueba no prevista: ${path}`)
  })
  const router = createMemoryAppRouter([ruta])
  render(<SessionContext.Provider value={{ status: 'authenticated', user: { rol, estado: 'ACTIVO', nombre: 'Titular', apellido: 'Prueba' }, logout: vi.fn(), clearSession: vi.fn() }}>
    <RouterProvider router={router} />
  </SessionContext.Provider>)
  return { router, request }
}

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('ARCH15 consultas y composición por rol', () => {
  it('ASESOR consulta planes, navega a precios, filtra y abre documentos sin API ADMIN ni escrituras', async () => {
    const { router, request } = montar('ASESOR', '/asesor/planes')
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalles' }))
    expect(screen.getByText('Condición sintética.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ver tarifas' }))
    await screen.findByRole('cell', { name: '$ 200.000,00' })
    expect(router.state.location.pathname).toBe('/asesor/precios')
    expect(router.state.location.search).toBe('?planId=1&modalidad=Obligatorio')
    fireEvent.change(screen.getByRole('combobox', { name: 'Modalidad Tarifaria' }), { target: { value: 'Voluntario' } })
    await waitFor(() => expect(request).toHaveBeenCalledWith('/api/catalogo/tarifario/planes/1/Voluntario'))
    expect(screen.getByRole('link', { name: 'Exportar PDF' }).getAttribute('href')).toContain('/api/catalogo/listas/1/')
    expect(screen.queryByRole('link', { name: 'Versiones' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Configuración' })).toBeNull()
    for (const [path, options] of request.mock.calls) {
      expect(path).toMatch(/^\/api\/catalogo\//)
      expect(options?.method ?? 'GET').toBe('GET')
    }
  })

  it('ADMIN conserva sus URLs de lectura y enlaces de gestión', async () => {
    const { request } = montar('ADMIN', '/admin/tarifario?planId=1')
    await screen.findByRole('cell', { name: '$ 200.000,00' })
    expect(request).toHaveBeenCalledWith('/api/admin/planes')
    expect(request).toHaveBeenCalledWith('/api/admin/tarifario/planes/1/Obligatorio')
    expect(screen.getByRole('link', { name: 'Versiones' }).getAttribute('href')).toBe('/admin/versiones')
    expect(screen.getByRole('link', { name: 'Configuración' }).getAttribute('href')).toBe('/admin/configuracion')
  })

  for (const ruta of ['/admin/empleados', '/admin/versiones', '/admin/configuracion']) {
    it(`ASESOR no puede montar la gestión ${ruta}`, async () => {
      const { router, request } = montar('ASESOR', ruta)
      await waitFor(() => expect(router.state.location.pathname).toBe('/access-denied'))
      expect(request).not.toHaveBeenCalled()
    })
  }

  it('ADMIN no puede montar las rutas de cotización ASESOR', async () => {
    const { router, request } = montar('ADMIN', '/asesor/nueva')
    await waitFor(() => expect(router.state.location.pathname).toBe('/access-denied'))
    expect(request).not.toHaveBeenCalled()
  })

  for (const rol of ['ADMIN', 'ASESOR']) {
    it(`PERFIL y su modal conservan identidad y cierre para ${rol}`, async () => {
      montar(rol, '/perfil')
      expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Mi perfil' }))
      expect(screen.getByRole('dialog', { name: 'Mi perfil' })).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  }

  it('consulta conserva mensajes y códigos de error públicos', async () => {
    const { request } = montar('ASESOR', '/asesor/planes')
    request.mockRejectedValue(new ApiError({ status: 409, code: 'ADMIN_ESTADO', message: 'No existe una versión vigente.' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText('No existe una versión vigente.')).toBeTruthy()
  })

  it('compatibilidad reutiliza identidades, no duplica APIs ni primitivas', () => {
    expect(catalogoAnterior).toBe(catalogoApi)
    expect(asesorCatalogoApi).toBe(catalogoApi)
    expect(Object.keys(catalogoApi).sort()).toEqual(['consultarTarifario', 'listarPlanes'])
    expect(AdminAvatar).toBe(Avatar)
    expect(AdminModal).toBe(Modal)
  })
})
