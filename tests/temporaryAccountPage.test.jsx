import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/shared/lib/httpClient.js'
import { SessionProvider } from '../src/features/auth/context/SessionProvider.jsx'
import { TemporaryAccountPage } from '../src/features/auth/pages/TemporaryAccountPage.jsx'
import { authApi } from '../src/features/auth/api/authApi.js'

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

/**
 * Sesión autenticada de pruebas con identidad mínima del contrato.
 * @param {{ rol?: 'ADMIN'|'ASESOR' }} [overrides] Ajustes del usuario simulado.
 * @returns {object} Doble de pruebas del API AUTH con sesión activa.
 */
function createSessionAuthClient({ rol = 'ASESOR' } = {}) {
  return {
    getMe: vi.fn().mockResolvedValue({
      user: { nombre: 'María', apellido: 'Pérez', email: `${rol.toLowerCase()}@example.test`, rol, estado: 'ACTIVO' },
    }),
    login: vi.fn(),
    logout: vi.fn(),
  }
}

/**
 * Renderiza la interfaz temporal con el proveedor de sesión real y rutas mínimas.
 * @param {object} authClient Doble del API AUTH inyectado.
 * @param {Array<string|object>} [initialEntries] Entradas iniciales del historial.
 * @returns {ReturnType<typeof render>} Resultado de React Testing Library.
 */
function renderTemporaryAccount(authClient, initialEntries = ['/asesor']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <SessionProvider authClient={authClient}>
        <Routes>
          <Route path="/login" element={<div>Pantalla de ingreso</div>} />
          <Route path="/asesor" element={<TemporaryAccountPage />} />
          <Route path="/admin" element={<TemporaryAccountPage />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  )
}

describe('TemporaryAccountPage', () => {
  it('presenta la identidad real de la sesión con la marca temporal', async () => {
    renderTemporaryAccount(createSessionAuthClient())

    expect(await screen.findByText('Cuenta ASESOR')).toBeTruthy()
    expect(screen.getByText('Interfaz temporal de AUTH')).toBeTruthy()
    expect(screen.getByText('María Pérez')).toBeTruthy()
    expect(screen.getByText('asesor@example.test')).toBeTruthy()
    expect(screen.getByText('ASESOR')).toBeTruthy()
  })

  it('cierra la sesión y regresa al ingreso con el mecanismo de SessionProvider', async () => {
    const authClient = createSessionAuthClient()
    renderTemporaryAccount(authClient)

    const logoutButton = await screen.findByRole('button', { name: 'Cerrar sesión' })
    await act(async () => {
      fireEvent.click(logoutButton)
    })

    await waitFor(() => expect(authClient.logout).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Pantalla de ingreso')).toBeTruthy()
  })

  it('rechaza localmente la confirmación de contraseña distinta sin llamar al servicio', async () => {
    renderTemporaryAccount(createSessionAuthClient())

    await screen.findByText('Cuenta ASESOR')
    fireEvent.change(screen.getByLabelText(/^Contraseña actual/, { selector: '#account-current-password' }), {
      target: { value: 'Actual123!' },
    })
    fireEvent.change(screen.getByLabelText(/^Nueva contraseña/), { target: { value: 'Segura123!' } })
    fireEvent.change(screen.getByLabelText(/^Confirmar nueva contraseña/), { target: { value: 'Segura124!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(await screen.findByText('Las contraseñas ingresadas no coinciden.')).toBeTruthy()
    expect(authApi.changePassword).not.toHaveBeenCalled()
  })

  it('cambia la contraseña con el DTO del contrato y anuncia el cierre de sesiones', async () => {
    authApi.changePassword.mockResolvedValue({ message: 'Contraseña actualizada.' })
    renderTemporaryAccount(createSessionAuthClient())

    await screen.findByText('Cuenta ASESOR')
    fireEvent.change(screen.getByLabelText(/^Contraseña actual/, { selector: '#account-current-password' }), {
      target: { value: 'Actual123!' },
    })
    fireEvent.change(screen.getByLabelText(/^Nueva contraseña/), { target: { value: 'Segura123!' } })
    fireEvent.change(screen.getByLabelText(/^Confirmar nueva contraseña/), { target: { value: 'Segura123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(await screen.findByText('Contraseña actualizada')).toBeTruthy()
    expect(screen.getByText(/todas las sesiones fueron cerradas/)).toBeTruthy()
    expect(authApi.changePassword).toHaveBeenCalledWith({
      currentPassword: 'Actual123!',
      newPassword: 'Segura123!',
    })
  })

  it('descarta la sesión revocada al salir tras el cambio de contraseña', async () => {
    const authClient = createSessionAuthClient()
    authApi.changePassword.mockResolvedValue({ message: 'Contraseña actualizada.' })
    renderTemporaryAccount(authClient)

    await screen.findByText('Cuenta ASESOR')
    fireEvent.change(screen.getByLabelText(/^Contraseña actual/, { selector: '#account-current-password' }), {
      target: { value: 'Actual123!' },
    })
    fireEvent.change(screen.getByLabelText(/^Nueva contraseña/), { target: { value: 'Segura123!' } })
    fireEvent.change(screen.getByLabelText(/^Confirmar nueva contraseña/), { target: { value: 'Segura123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    const exitButton = await screen.findByRole('button', { name: 'Ir a iniciar sesión' })
    expect(authClient.logout).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(exitButton)
    })

    expect(await screen.findByText('Pantalla de ingreso')).toBeTruthy()
  })

  it('traduce el rechazo de la contraseña actual al aviso del formulario', async () => {
    authApi.changePassword.mockRejectedValue(new ApiError({
      status: 400,
      code: 'CURRENT_PASSWORD_INVALID',
      message: 'La contraseña actual no es correcta.',
    }))
    renderTemporaryAccount(createSessionAuthClient())

    await screen.findByText('Cuenta ASESOR')
    fireEvent.change(screen.getByLabelText(/^Contraseña actual/, { selector: '#account-current-password' }), {
      target: { value: 'Mala123!' },
    })
    fireEvent.change(screen.getByLabelText(/^Nueva contraseña/), { target: { value: 'Segura123!' } })
    fireEvent.change(screen.getByLabelText(/^Confirmar nueva contraseña/), { target: { value: 'Segura123!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeTruthy()
  })

  it('solicita el cambio de correo y conserva el vigente hasta confirmar', async () => {
    authApi.changeEmail.mockResolvedValue({ message: 'Te enviamos un enlace de confirmación.', status: 'pending' })
    renderTemporaryAccount(createSessionAuthClient({ rol: 'ADMIN' }))

    await screen.findByText('Cuenta ADMIN')
    fireEvent.change(screen.getByLabelText(/^Correo nuevo/), { target: { value: 'nuevo@example.test' } })
    fireEvent.change(screen.getByLabelText(/^Contraseña actual/, { selector: '#account-email-password' }), {
      target: { value: 'Actual123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar cambio de correo' }))

    expect(await screen.findByText('Solicitud de cambio de correo recibida')).toBeTruthy()
    expect(screen.getByText(/Tu correo actual sigue operando/)).toBeTruthy()
    expect(authApi.changeEmail).toHaveBeenCalledWith({
      email: 'nuevo@example.test',
      currentPassword: 'Actual123!',
    })
  })

  it('informa el retraso del envío del enlace sin invertir la solicitud', async () => {
    authApi.changeEmail.mockResolvedValue({ message: 'Solicitud registrada.', verificationDelivery: 'RETRY_REQUIRED' })
    renderTemporaryAccount(createSessionAuthClient({ rol: 'ADMIN' }))

    await screen.findByText('Cuenta ADMIN')
    fireEvent.change(screen.getByLabelText(/^Correo nuevo/), { target: { value: 'nuevo@example.test' } })
    fireEvent.change(screen.getByLabelText(/^Contraseña actual/, { selector: '#account-email-password' }), {
      target: { value: 'Actual123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar cambio de correo' }))

    expect(await screen.findByText('El correo de confirmación no se envió en este momento')).toBeTruthy()
  })

  it('valida el formato del correo nuevo sin invocar el servicio', async () => {
    renderTemporaryAccount(createSessionAuthClient({ rol: 'ADMIN' }))

    await screen.findByText('Cuenta ADMIN')
    fireEvent.change(screen.getByLabelText(/^Correo nuevo/), { target: { value: 'correo-invalido' } })
    fireEvent.change(screen.getByLabelText(/^Contraseña actual/, { selector: '#account-email-password' }), {
      target: { value: 'Actual123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar cambio de correo' }))

    expect(await screen.findByText('Ingresa un correo electrónico válido.')).toBeTruthy()
    expect(authApi.changeEmail).not.toHaveBeenCalled()
  })

  it('convierte los errores de campo del contrato en mensajes por campo', async () => {
    authApi.changeEmail.mockRejectedValue(new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Revise los datos.',
      details: [{ field: 'email', message: 'El correo pertenece a otra cuenta.' }],
    }))
    renderTemporaryAccount(createSessionAuthClient({ rol: 'ADMIN' }))

    await screen.findByText('Cuenta ADMIN')
    fireEvent.change(screen.getByLabelText(/^Correo nuevo/), { target: { value: 'tomo@example.test' } })
    fireEvent.change(screen.getByLabelText(/^Contraseña actual/, { selector: '#account-email-password' }), {
      target: { value: 'Actual123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar cambio de correo' }))

    expect(await screen.findByText('El correo pertenece a otra cuenta.')).toBeTruthy()
  })
})
