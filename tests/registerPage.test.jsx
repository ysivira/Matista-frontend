/**
 * ============================================================
 * MATISTA | PRUEBAS DE REGISTRO PÚBLICO
 * ============================================================
 *
 * Archivo: registerPage.test.jsx
 * Módulo: Pruebas de autenticación
 *
 * Responsabilidad:
 * Verificar validaciones, DTO, confirmación y modal de espera,
 * preservando el bloqueo de envíos duplicados con API simulada.
 *
 * ============================================================
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/shared/lib/httpClient.js'
import { RegisterPage } from '../src/features/auth/pages/RegisterPage.jsx'

vi.mock('../src/features/auth/api/authApi.js', () => ({
  authApi: {
    register: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    getMe: vi.fn(),
    updateMe: vi.fn(),
    changePassword: vi.fn(),
    changeEmail: vi.fn(),
    confirmEmailChange: vi.fn(),
  },
}))

import { authApi } from '../src/features/auth/api/authApi.js'

/**
 * Renderiza la pantalla de registro dentro de un router de memoria.
 * @returns {ReturnType<typeof render>} Resultado de React Testing Library.
 */
function renderRegister() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  )
}

/**
 * Completa el formulario con los valores de referencia y lo envía.
 * @param {Partial<Record<string, string>>} overrides Valores específicos por campo.
 * @returns {void}
 */
function fillAndSubmit(overrides = {}) {
  const values = {
    legajo: '40512998',
    nombre: 'Ariel',
    apellido: 'Sosa',
    email: 'Ariel.Sosa@Example.test',
    telefono: '',
    direccion: '',
    password: 'Segura123!',
    passwordConfirmation: 'Segura123!',
    ...overrides,
  }
  fireEvent.change(screen.getByLabelText(/DNI \/ Legajo/), { target: { value: values.legajo } })
  fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: values.nombre } })
  fireEvent.change(screen.getByLabelText(/Apellido/), { target: { value: values.apellido } })
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: values.email } })
  if (values.telefono) {
    fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: values.telefono } })
  }
  if (values.direccion) {
    fireEvent.change(screen.getByLabelText(/Dirección/), { target: { value: values.direccion } })
  }
  // El anclaje evita capturar el campo de confirmación recién agregado.
  fireEvent.change(screen.getByLabelText(/^Contraseña/), { target: { value: values.password } })
  fireEvent.change(screen.getByLabelText(/^Confirmar contraseña/), { target: { value: values.passwordConfirmation } })
  fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }))
}

describe('RegisterPage', () => {
  beforeEach(() => {
    authApi.register.mockReset()
  })

  it('valida los campos obligatorios sin llamar al servicio', async () => {
    renderRegister()

    fireEvent.click(await screen.findByRole('button', { name: 'Registrarme' }))

    expect(screen.getAllByText('Este campo es obligatorio.')).toHaveLength(6)
    expect(authApi.register).not.toHaveBeenCalled()
  })

  it('rechaza el envío cuando las contraseñas no coinciden', async () => {
    renderRegister()

    fillAndSubmit({ passwordConfirmation: 'Otra123!' })

    expect(await screen.findByText('Las contraseñas ingresadas no coinciden.')).toBeTruthy()
    expect(authApi.register).not.toHaveBeenCalled()
  })

  it('valida el formato del legajo según el contrato', async () => {
    renderRegister()

    fillAndSubmit({ legajo: 'abc123' })

    expect(await screen.findByText('El DNI o legajo debe contener entre 7 y 10 dígitos.')).toBeTruthy()
    expect(authApi.register).not.toHaveBeenCalled()
  })

  it('envía el DTO exacto omitiendo los opcionales vacíos', async () => {
    authApi.register.mockResolvedValue({})
    renderRegister()

    fillAndSubmit()
    await waitFor(() => expect(authApi.register).toHaveBeenCalledTimes(1))

    expect(authApi.register).toHaveBeenCalledWith({
      legajo: '40512998',
      nombre: 'Ariel',
      apellido: 'Sosa',
      email: 'ariel.sosa@example.test',
      password: 'Segura123!',
    })
  })

  it('incluye únicamente los opcionales completados', async () => {
    authApi.register.mockResolvedValue({})
    renderRegister()

    fillAndSubmit({ telefono: '+54 9 11 1234-5678', direccion: 'Av. Siempre Viva 742' })
    await waitFor(() => expect(authApi.register).toHaveBeenCalledTimes(1))

    expect(authApi.register).toHaveBeenCalledWith({
      legajo: '40512998',
      nombre: 'Ariel',
      apellido: 'Sosa',
      email: 'ariel.sosa@example.test',
      telefono: '+54 9 11 1234-5678',
      direccion: 'Av. Siempre Viva 742',
      password: 'Segura123!',
    })
  })

  it('mapea los errores por campo del VALIDATION_FAILED del contrato', async () => {
    authApi.register.mockRejectedValue(new ApiError({
      status: 400,
      code: 'VALIDATION_FAILED',
      message: 'La solicitud contiene datos inválidos.',
      details: [{ field: 'email', message: 'El correo ya está registrado.' }],
    }))
    renderRegister()

    fillAndSubmit()

    expect(await screen.findByText('El correo ya está registrado.')).toBeTruthy()
    expect(screen.getByText('Revisa los datos del formulario')).toBeTruthy()
  })

  it('confirma el registro con verificación de correo y aprobación pendiente', async () => {
    authApi.register.mockResolvedValue({})
    renderRegister()

    fillAndSubmit()

    expect(await screen.findByText('Registro completado')).toBeTruthy()
    expect(screen.getByText(/Verificación de correo requerida/)).toBeTruthy()
    expect(screen.getByText(/un administrador habilitará/)).toBeTruthy()
  })

  it('informa cuando el correo de verificación no pudo enviarse', async () => {
    authApi.register.mockResolvedValue({ verificationDelivery: 'RETRY_REQUIRED' })
    renderRegister()

    fillAndSubmit()

    expect(await screen.findByText('El correo de verificación no se envió en este momento')).toBeTruthy()
  })

  it('no muestra el loading ante validaciones locales fallidas (SPEC-26)', () => {
    renderRegister()

    fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }))

    expect(screen.queryByRole('dialog', { name: 'Estamos creando tu cuenta' })).toBeNull()
    expect(authApi.register).not.toHaveBeenCalled()
  })

  it('muestra el loading durante el envío y lo cierra con la confirmación (SPEC-26)', async () => {
    let resolver
    authApi.register.mockImplementation(() => new Promise(res => { resolver = res }))
    renderRegister()

    fillAndSubmit()
    const dialogo = await screen.findByRole('dialog', { name: 'Estamos creando tu cuenta' })
    expect(dialogo.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByText(/preparando el correo de verificación/)).toBeTruthy()
    // El aviso inferior persiste mientras la solicitud sigue pendiente.
    expect(screen.getByText(/No cierres esta ventana/)).toBeTruthy()

    resolver({})
    expect(await screen.findByText('Registro completado')).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Estamos creando tu cuenta' })).toBeNull()
  })

  it('cierra el loading y restablece el envío cuando el backend rechaza (SPEC-26)', async () => {
    let rechazar
    authApi.register.mockImplementation(() => new Promise((_, rej) => { rechazar = rej }))
    renderRegister()

    fillAndSubmit()
    await screen.findByRole('dialog', { name: 'Estamos creando tu cuenta' })

    rechazar(new ApiError({ status: 400, code: 'IDENTITY_CONFLICT', message: 'El DNI o correo ya se encuentra reservado.' }))
    expect(await screen.findByText(/ya se encuentra reservado|reservado/i)).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Estamos creando tu cuenta' })).toBeNull()

    // El formulario vuelve a estar disponible: puede reintentar sin doble envío previo.
    authApi.register.mockResolvedValue({})
    fireEvent.click(screen.getByRole('button', { name: 'Registrarme' }))
    await waitFor(() => expect(authApi.register).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Registro completado')).toBeTruthy()
  })

  it('evita envíos duplicados mientras el loading está abierto (SPEC-26)', async () => {
    let resolver
    authApi.register.mockImplementation(() => new Promise(res => { resolver = res }))
    renderRegister()

    fillAndSubmit()
    await screen.findByRole('dialog', { name: 'Estamos creando tu cuenta' })

    // El botón queda deshabilitado durante el envío; ningún doble clic reenvía.
    expect(screen.getByRole('button', { name: 'Registrando...' }).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Registrando...' }))
    resolver({})
    await waitFor(() => expect(authApi.register).toHaveBeenCalledTimes(1))
  })
})
