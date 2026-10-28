/**
 * ============================================================
 * MATISTA | PRUEBAS DEL DIRECTORIO
 * ============================================================
 *
 * Archivo: employeesPage.test.jsx
 * Módulo: Pruebas administrativas
 *
 * Responsabilidad:
 * Probar filtros, paginación y confirmaciones, preservando
 * resultados montados y descartando respuestas obsoletas de API.
 *
 * ============================================================
 */
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

  it('deshabilita la activación mientras el correo del listado siga sin verificar (SPEC-25)', async () => {
    adminApi.listEmployees.mockResolvedValue({
      empleados: [empleado({ estado: 'PENDIENTE', email_verificado: false })],
    })
    renderDirectory()

    const boton = await screen.findByRole('button', { name: 'Activar (correo sin verificar)' })
    expect(boton.disabled).toBe(true)
    expect(adminApi.getEmployee).not.toHaveBeenCalled()
    expect(adminApi.changeEstado).not.toHaveBeenCalled()
  })

  it('mantiene habilitada la activación cuando el listado informa correo verificado', async () => {
    adminApi.listEmployees.mockResolvedValue({
      empleados: [empleado({ estado: 'PENDIENTE', email_verificado: true })],
    })
    renderDirectory()

    expect((await screen.findByRole('button', { name: 'Activar' })).disabled).toBe(false)
  })

  it('reactiva una cuenta INACTIVO con correo verificado informado por el listado', async () => {
    adminApi.listEmployees.mockResolvedValue({
      empleados: [empleado({ estado: 'INACTIVO', email_verificado: true })],
    })
    adminApi.getEmployee.mockResolvedValue({
      empleado: empleado({ estado: 'INACTIVO', email_verificado: true }),
    })
    adminApi.changeEstado.mockResolvedValue({ empleado: { estado: 'ACTIVO' } })
    renderDirectory()

    fireEvent.click(await screen.findByRole('button', { name: 'Reactivar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Confirmar reactivar' })
    fireEvent.click(within(dialogo).getByRole('button', { name: /Confirmar reactivar/ }))

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

describe('regresión: transición de filtros sin parpadeo', () => {
  it('no remonta la pantalla completa al recargar desde un filtro que no devolvió filas', async () => {
    // Consulta inicial vacía: reproduce la combinación previa sin resultados
    // (por ejemplo BAJA) que provocaba el parpadeo intermitente.
    adminApi.listEmployees.mockResolvedValueOnce({ empleados: [] })
    renderDirectory()
    expect(await screen.findByText('No hay empleados con esos filtros.')).toBeTruthy()

    // El cambio a ACTIVO queda pendiente: el listado se mantiene montado,
    // sin pantalla completa y sin indicador de recarga intercalado.
    let resolverActivo
    adminApi.listEmployees.mockImplementationOnce(
      () => new Promise((resolve) => { resolverActivo = resolve }),
    )
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'ACTIVO' } })
    await waitFor(() => expect(resolverActivo).toBeTruthy())
    await waitFor(() => expect(screen.queryByText('Cargando el directorio...')).toBeNull())
    expect(screen.queryByText('No hay empleados con esos filtros.')).toBeTruthy()

    resolverActivo({ empleados: [empleado()] })
    expect(await screen.findAllByText('Nueva Cuenta')).toBeTruthy()
    expect(screen.queryByText('Cargando el directorio...')).toBeNull()
  })

  it('descarta la respuesta obsoleta de cambios consecutivos y muestra solo el filtro vigente', async () => {
    adminApi.listEmployees.mockResolvedValueOnce({ empleados: [empleado()] }) // Carga inicial con datos
    let resolverActivo
    let resolverInactivo
    adminApi.listEmployees
      // ACTIVO se consulta primero pero su respuesta tarda más que la de INACTIVO
      .mockImplementationOnce(() => new Promise((resolve) => { resolverActivo = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolverInactivo = resolve }))
    renderDirectory()
    expect(await screen.findAllByText('Nueva Cuenta')).toBeTruthy()

    // Dos cambios consecutivos: ACTIVO queda obsoleto respecto de INACTIVO.
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'ACTIVO' } })
    await waitFor(() => expect(resolverActivo).toBeTruthy())
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'INACTIVO' } })
    await waitFor(() => expect(resolverInactivo).toBeTruthy())

    // La respuesta tardía de ACTIVO llega con el filtro vigente en INACTIVO.
    resolverActivo({ empleados: [empleado({ legajo: '0000000011', nombre: 'Resuelta', estado: 'ACTIVO' })] })
    resolverInactivo({ empleados: [empleado({ legajo: '0000000022', nombre: 'Actual', estado: 'INACTIVO' })] })

    expect(await screen.findAllByText(/^Actual/)).toBeTruthy()
    expect(screen.queryByText(/Resuelta/)).toBeNull() // La respuesta obsoleta no se aplica
    expect(screen.queryByText('Cargando el directorio...')).toBeNull()
    expect(adminApi.listEmployees).toHaveBeenCalledTimes(3)
  })
})

describe('regresión: paginación compartida del directorio', () => {
  /** Lista sintética de empleados paginable con nombres únicos. */
  function listaEmpleados(cantidad) {
    return Array.from({ length: cantidad }, (_, i) => empleado({
      legajo: `0000081${String(i).padStart(2, '0')}`,
      nombre: `Empleado${i}`,
    }))
  }

  /** Filas de datos visibles, excluyendo el encabezado de la tabla. */
  function filasVisibles() {
    return screen.getByRole('table').querySelectorAll('tbody tr')
  }

  it('pagina el listado con el mismo estado en la navegación entre páginas', async () => {
    adminApi.listEmployees.mockResolvedValue({ empleados: listaEmpleados(12) })
    renderDirectory()
    expect(await screen.findAllByText(/^Empleado\d/)).toHaveLength(10)
    expect(screen.getByText('Mostrando 1–10 de 12 empleados')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Página anterior' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Página siguiente' }).disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(screen.getAllByText(/^Empleado\d/)).toHaveLength(2)
    expect(screen.getByText('Mostrando 11–12 de 12 empleados')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Página siguiente' }).disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }))
    expect(await screen.findAllByText(/^Empleado\d/)).toHaveLength(10)
    expect(screen.getByText('Mostrando 1–10 de 12 empleados')).toBeTruthy()
  })

  it('cambia las filas por página reutilizando la misma fuente de paginación', async () => {
    adminApi.listEmployees.mockResolvedValue({ empleados: listaEmpleados(12) })
    renderDirectory()
    expect(await screen.findAllByText(/^Empleado\d/)).toHaveLength(10)

    fireEvent.change(screen.getByLabelText('Seleccionar filas por página'), { target: { value: '25' } })
    expect(filasVisibles()).toHaveLength(12)
    expect(screen.getByText('Mostrando 1–12 de 12 empleados')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Página anterior' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Página siguiente' }).disabled).toBe(true)
  })

  it('reinicia a la primera página al aplicar una nueva consulta y admite cero resultados', async () => {
    adminApi.listEmployees.mockResolvedValueOnce({ empleados: listaEmpleados(12) })
    adminApi.listEmployees.mockResolvedValueOnce({ empleados: [empleado({ nombre: 'UnicoA' }), empleado({ legajo: '0000000098', nombre: 'UnicoB' })] })
    renderDirectory()
    expect(await screen.findAllByText(/^Empleado\d/)).toHaveLength(10)

    // Navegar a la segunda página y luego aplicar el filtro de rol: la nueva
    // consulta debe volver a la primera página con el resultado vigente.
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(filasVisibles()).toHaveLength(2)
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'ADMIN' } })
    expect(await screen.findAllByText(/^Unico/)).toHaveLength(2)
    expect(screen.getByText('Mostrando 1–2 de 2 empleados')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Página siguiente' }).disabled).toBe(true)

    // Búsqueda sin resultados: contador en cero y navegación deshabilitada.
    adminApi.listEmployees.mockResolvedValueOnce({ empleados: [] })
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'BAJA' } })
    await screen.findByText('No hay empleados con esos filtros.')
    expect(screen.getByText('Mostrando 0 de 0 empleados')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Página anterior' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Página siguiente' }).disabled).toBe(true)
  })
})
