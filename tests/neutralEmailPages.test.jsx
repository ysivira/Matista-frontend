import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NetworkError } from '../src/shared/lib/httpClient.js'
import { ResendVerificationPage } from '../src/features/auth/pages/ResendVerificationPage.jsx'
import { ForgotPasswordPage } from '../src/features/auth/pages/ForgotPasswordPage.jsx'

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
 * Renderiza una pantalla dentro de un router de memoria sin rutas emparejadas.
 * @param {import('react').ReactElement} element Pantalla pública a probar.
 * @returns {ReturnType<typeof render>} Resultado de React Testing Library.
 */
function renderPage(element) {
  return render(<MemoryRouter>{element}</MemoryRouter>)
}

describe('ResendVerificationPage', () => {
  beforeEach(() => {
    authApi.resendVerification.mockReset()
  })

  it('valida el correo antes de enviar la solicitud', async () => {
    renderPage(<ResendVerificationPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Reenviar correo de confirmación' }))

    expect(screen.getByText('Este campo es obligatorio.')).toBeTruthy()
    expect(authApi.resendVerification).not.toHaveBeenCalled()
  })

  it('confirma de forma neutral sin revelar la existencia de cuentas', async () => {
    authApi.resendVerification.mockResolvedValue({})
    renderPage(<ResendVerificationPage />)

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'asesor@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar correo de confirmación' }))

    expect(await screen.findByText('Solicitud recibida')).toBeTruthy()
    expect(screen.getByText(/Si el correo corresponde/)).toBeTruthy()
    expect(authApi.resendVerification).toHaveBeenCalledWith('asesor@example.test')
  })

  it('presenta el fallo técnico sin bloquear el reenvío', async () => {
    authApi.resendVerification.mockRejectedValue(new NetworkError(new Error('fetch failed')))
    renderPage(<ResendVerificationPage />)

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'asesor@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar correo de confirmación' }))

    expect(await screen.findByText('Sin conexión con la API')).toBeTruthy()
  })
})

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    authApi.forgotPassword.mockReset()
  })

  it('envía la solicitud usando el servicio existente', async () => {
    authApi.forgotPassword.mockResolvedValue({})
    renderPage(<ForgotPasswordPage />)

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'asesor@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    await waitFor(() => expect(authApi.forgotPassword).toHaveBeenCalledWith('asesor@example.test'))
    expect(await screen.findByText('Solicitud enviada con éxito')).toBeTruthy()
  })

  it('muestra la confirmación neutra con el correo consultado', async () => {
    authApi.forgotPassword.mockResolvedValue({})
    renderPage(<ForgotPasswordPage />)

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'asesor@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(await screen.findByText(/asesor@example\.test/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' }).getAttribute('href')).toBe('/login')
  })

  it('mapea errores de validación del contrato a los campos', async () => {
    authApi.forgotPassword.mockRejectedValue(new ApiError({
      status: 400,
      code: 'VALIDATION_FAILED',
      message: 'La solicitud contiene datos inválidos.',
      details: [{ field: 'email', message: 'El reenvío está temporalmente limitado para este correo.' }],
    }))
    renderPage(<ForgotPasswordPage />)

    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'asesor@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(await screen.findByText('El reenvío está temporalmente limitado para este correo.')).toBeTruthy()
  })
})
