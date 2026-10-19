import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EmployeesPage } from '../src/features/admin/pages/EmployeesPage.jsx'
import { adminApi } from '../src/features/admin/api/adminApi.js'
import { SessionContext } from '../src/features/auth/context/SessionContext.js'
import { ApiError } from '../src/shared/lib/httpClient.js'

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

/** Empleado público sintético del directorio. */
function empleado(overrides = {}) {
  return {
    legajo: '0000000099', nombre: 'Nueva', apellido: 'Cuenta', email: 'nueva@matista.test',
    rol: 'ASESOR', estado: 'ACTIVO', ...overrides,
  }
}

beforeEach(() => {
  adminApi.listEmployees.mockResolvedValue({ empleados: [] })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('directorio de empleados (SL-1)', () => {
  it('carga el listado y muestra solo datos públicos', async () => {
    adminApi.listEmployees.mockResolvedValue({
      empleados: [empleado(), empleado({ legajo: '0000000002', estado: 'PENDIENTE', rol: 'ADMIN', nombre: 'Pendiente', apellido: 'Dos' })],
    })
    renderDirectory()

    await screen.findAllByText('Nueva Cuenta')
    expect(screen.getByText('0000000002')).toBeTruthy()
    expect(screen.queryByText(/password_hash/)).toBeNull()
    expect(adminApi.listEmployees).toHaveBeenCalledWith({ estado: 'todos', rol: 'todos', busqueda: '' })
  })

  it('aplica los filtros de estado y rol en cada consulta', async () => {
    renderDirectory()

    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'PENDIENTE' } })
    await waitFor(() => expect(adminApi.listEmployees).toHaveBeenCalledWith(expect.objectContaining({ estado: 'PENDIENTE' })))
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'ADMIN' } })
    await waitFor(() => expect(adminApi.listEmployees).toHaveBeenCalledWith(expect.objectContaining({ rol: 'ADMIN' })))
  })

  it('busca un empleado y abre su detalle con campos públicos', async () => {
    adminApi.listEmployees.mockResolvedValue({ empleados: [empleado()] })
    adminApi.getEmployee.mockResolvedValue({ empleado: empleado({ telefono: '12345678' }) })
    renderDirectory()

    fireEvent.change(screen.getByLabelText('Búsqueda'), { target: { value: 'nueva@matista' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() => expect(adminApi.listEmployees).toHaveBeenCalledWith(expect.objectContaining({ busqueda: 'nueva@matista' })))

    fireEvent.click(await screen.findByRole('button', { name: 'Nueva Cuenta' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Detalle del empleado' })
    expect(within(dialogo).getByText('12345678')).toBeTruthy()
    expect(screen.queryByText(/password/)).toBeNull()
  })

  it('prohibe acciones sobre la propia cuenta y sugiere Mi perfil', async () => {
    adminApi.listEmployees.mockResolvedValue({ empleados: [empleado({ legajo: '0000000001', rol: 'ADMIN' })] })
    renderDirectory()

    expect(await screen.findByText('0000000001')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Desactivar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cambiar a ASESOR' })).toBeNull()
    expect(await screen.findByText(/tarjeta de usuario al pie de la barra lateral/)).toBeTruthy()
  })

  it('activa una cuenta PENDIENTE con el modal y recarga el directorio', async () => {
    adminApi.listEmployees.mockResolvedValue({ empleados: [{ ...empleado(), estado: 'PENDIENTE' }] })
    adminApi.getEmployee.mockResolvedValue({ empleado: { ...empleado(), estado: 'PENDIENTE' } })
    adminApi.changeEstado.mockResolvedValue({ empleado: { estado: 'ACTIVO' } })
    renderDirectory()

    fireEvent.click(await screen.findByRole('button', { name: 'Activar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Confirmar activar' })
    fireEvent.click(within(dialogo).getByRole('button', { name: /Confirmar activar/ }))

    await waitFor(() => expect(adminApi.changeEstado).toHaveBeenCalledWith('0000000099', 'ACTIVO'))
    expect(await screen.findByText('Estado actualizado')).toBeTruthy()
  })


  it('promueve a ADMIN desde el menú contextual compacto', async () => {
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

  it('presenta el rechazo de negocio de la API sin exponer datos técnicos', async () => {
    adminApi.listEmployees.mockResolvedValue({ empleados: [empleado()] })
    adminApi.getEmployee.mockResolvedValue({ empleado: empleado() })
    adminApi.changeEstado.mockRejectedValue(new ApiError({
      status: 409, code: 'ULTIMO_ADMIN_PROTEGIDO',
      message: 'No se puede desactivar al último ADMIN activo.',
    }))
    renderDirectory()

    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Confirmar desactivar' })
    fireEvent.click(within(dialogo).getByRole('button', { name: /Confirmar desactivar/ }))

    expect(await screen.findByText('El directorio rechazó la operación')).toBeTruthy()
    await screen.findByText('No se puede desactivar al último ADMIN activo.')
  })
})
