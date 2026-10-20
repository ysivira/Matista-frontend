import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EmployeesPage } from '../src/features/admin/pages/EmployeesPage.jsx'
import { adminApi } from '../src/features/admin/api/adminApi.js'
import { SessionContext } from '../src/features/auth/context/SessionContext.js'

vi.mock('../src/features/admin/api/adminApi.js', () => ({
  adminApi: {
    listEmployees: vi.fn().mockResolvedValue({ empleados: [] }),
    getEmployee: vi.fn().mockResolvedValue({ empleado: null }),
    changeEstado: vi.fn().mockResolvedValue({ empleado: {} }),
    changeRol: vi.fn().mockResolvedValue({ empleado: {} }),
  },
}))

/** Sesión ADMIN sintética asociada a la cuenta operante 0000000001. */
function seededSession() {
  return {
    status: 'authenticated', error: null,
    user: { legajo: '0000000001', rol: 'ADMIN', estado: 'ACTIVO', nombre: 'Admin' },
  }
}

/** Empleado público sintético del directorio. */
function empleado(overrides = {}) {
  return {
    legajo: '0000000099', nombre: 'Nueva', apellido: 'Cuenta', email: 'nueva@matista.test',
    rol: 'ASESOR', estado: 'ACTIVO', ...overrides,
  }
}

/**
 * Reemplaza matchMedia por un stub controlable para forzar la presentación
 * de tarjetas y simular cambios de resolución en caliente.
 * @param {boolean} matches Coincidencia inicial de la media query.
 * @returns {(nueva: boolean) => void} Función para disparar el cambio de vista.
 */
function stubMediaQuery(matches) {
  const oyentes = new Set()
  // La lista de medios debe ser el MISMO objeto en cada llamada de matchMedia
  // porque useSyncExternalStore lee `matches` desde la suscripción.
  const consulta = {
    matches,
    addEventListener: (_tipo, oyente) => oyentes.add(oyente),
    removeEventListener: (_tipo, oyente) => oyentes.delete(oyente),
  }
  vi.stubGlobal('matchMedia', () => consulta)
  return (nueva) => { consulta.matches = nueva; oyentes.forEach((oyente) => oyente({ matches: nueva })) }
}

/** Renderiza el directorio con contexto de sesión y API simuladas. */
function renderDirectory() {
  return render(
    <SessionContext.Provider value={seededSession()}>
      <MemoryRouter initialEntries={['/admin']}>
        <EmployeesPage />
      </MemoryRouter>
    </SessionContext.Provider>,
  )
}

beforeEach(() => {
  stubMediaQuery(true)
  adminApi.listEmployees.mockResolvedValue({ empleados: [] })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('directorio de empleados en tarjetas (SPEC-03 responsive)', () => {
  it('muestra la tarjeta con datos públicos y sin tabla en móvil', async () => {
    adminApi.listEmployees.mockResolvedValue({
      empleados: [
        empleado(),
        empleado({ legajo: '0000000044', nombre: 'Carla', apellido: 'Sánchez', email: 'carla@matista.test', rol: 'ADMIN', estado: 'INACTIVO' }),
      ],
    })
    renderDirectory()

    expect(await screen.findByText('Nueva Cuenta')).toBeTruthy()
    expect(screen.getByText('0000000099')).toBeTruthy()
    expect(screen.getByText('nueva@matista.test')).toBeTruthy()
    expect(screen.getByText('Carla Sánchez')).toBeTruthy()
    expect(screen.getByLabelText('Rol')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('Mostrando 1–2 de 2 empleados')).toBeTruthy()
  })

  it('aplica los filtros sobre la consulta compartida que alimenta las tarjetas', async () => {
    adminApi.listEmployees.mockResolvedValue({ empleados: [empleado({ estado: 'PENDIENTE' })] })
    renderDirectory()

    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'PENDIENTE' } })
    await waitFor(() => expect(adminApi.listEmployees).toHaveBeenLastCalledWith(expect.objectContaining({ estado: 'PENDIENTE' })))
    expect(await screen.findByRole('button', { name: 'Activar' })).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('activa desde tarjeta y comparte el modal de confirmación', async () => {
    adminApi.listEmployees.mockResolvedValue({ empleados: [empleado({ estado: 'PENDIENTE' })] })
    adminApi.getEmployee.mockResolvedValue({ empleado: { ...empleado(), estado: 'PENDIENTE' } })
    adminApi.changeEstado.mockResolvedValue({ empleado: { estado: 'ACTIVO' } })
    renderDirectory()

    fireEvent.click(await screen.findByRole('button', { name: 'Activar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Confirmar activar' })
    fireEvent.click(within(dialogo).getByRole('button', { name: /Confirmar activar/ }))

    await waitFor(() => expect(adminApi.changeEstado).toHaveBeenCalledWith('0000000099', 'ACTIVO'))
    expect(await screen.findByText('Estado actualizado')).toBeTruthy()
  })

  it('ofrece Desactivar y Dar baja en ACTIVO sin acciones sobre la propia cuenta', async () => {
    adminApi.listEmployees.mockResolvedValue({
      empleados: [empleado(), empleado({ legajo: '0000000001', rol: 'ADMIN' })],
    })
    renderDirectory()

    expect(await screen.findByRole('button', { name: 'Desactivar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Dar baja' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Más acciones de Nueva Cuenta' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Más acciones de Admin' })).toBeNull()
  })

  it('promueve a ADMIN desde el menú contextual de la tarjeta', async () => {
    adminApi.listEmployees.mockResolvedValue({ empleados: [empleado()] })
    adminApi.changeRol.mockResolvedValue({ empleado: { ...empleado(), rol: 'ADMIN' } })
    renderDirectory()

    fireEvent.click(await screen.findByRole('button', { name: 'Más acciones de Nueva Cuenta' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Promover a ADMIN' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Confirmar promover a ADMIN' })
    fireEvent.click(within(dialogo).getByRole('button', { name: /Confirmar promover a ADMIN/ }))

    await waitFor(() => expect(adminApi.changeRol).toHaveBeenCalledWith('0000000099', 'ADMIN'))
    expect(await screen.findByText('Estado actualizado')).toBeTruthy()
  })

  it('abre el detalle del empleado desde la tarjeta', async () => {
    adminApi.listEmployees.mockResolvedValue({ empleados: [empleado()] })
    adminApi.getEmployee.mockResolvedValue({ empleado: empleado({ telefono: '12345678' }) })
    renderDirectory()

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva Cuenta' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Detalle del empleado' })
    expect(within(dialogo).getByText('12345678')).toBeTruthy()
    expect(screen.queryByText(/password/)).toBeNull()
  })

  it('vuelve a la tabla al superar el punto de quiebre sin recargar', async () => {
    adminApi.listEmployees.mockResolvedValue({ empleados: [empleado()] })
    const cambiarVista = stubMediaQuery(true)
    renderDirectory()

    expect(await screen.findByText('Nueva Cuenta')).toBeTruthy()
    act(() => cambiarVista(false))

    expect(screen.getByRole('columnheader', { name: 'Empleado' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Desactivar' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Nueva Cuenta' })).toBeTruthy()
  })
})
