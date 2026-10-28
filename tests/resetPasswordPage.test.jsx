/**
 * ============================================================
 * MATISTA | PRUEBAS DE RESTABLECIMIENTO
 * ============================================================
 *
 * Archivo: resetPasswordPage.test.jsx
 * Módulo: Pruebas de autenticación
 *
 * Responsabilidad:
 * Probar enlace sin token, confirmación de contraseña, envío
 * correcto y rechazo del enlace con servicio AUTH simulado.
 *
 * ============================================================
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/shared/lib/httpClient.js'
import { ResetPasswordPage } from '../src/features/auth/pages/ResetPasswordPage.jsx'

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
 * Renderiza el restablecimiento con una entrada de historial controlada.
 * @param {string} [entry] Entrada inicial, incluido el fragmento con token.
 * @returns {ReturnType<typeof render>} Resultado de React Testing Library.
 */
function renderReset(entry = '/reset-password#token=abc') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  )
}

/**
 * Completa el formulario de restablecimiento y lo envía.
 * @param {{ newPassword?: string, confirmation?: string }} values Valores a digitar.
 * @returns {void}
 */
function fillAndSubmit({ newPassword = 'NuevaClave1!', confirmation = 'NuevaClave1!' } = {}) {
  const passwordInputs = screen.getAllByLabelText(/contraseña/i)
  fireEvent.change(passwordInputs[0], { target: { value: newPassword } })
  fireEvent.change(passwordInputs[1], { target: { value: confirmation } })
  fireEvent.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    authApi.resetPassword.mockReset()
  })

  it('no permite restablecer cuando el enlace no trae token', async () => {
    renderReset('/reset-password')

    expect(await screen.findByText('Enlace de restablecimiento inválido o expirado')).toBeTruthy()
    expect(authApi.resetPassword).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Solicitar un nuevo enlace' }).getAttribute('href'))
      .toBe('/forgot-password')
  })

  it('rechaza confirmaciones de contraseña que no coinciden', async () => {
    renderReset()

    fillAndSubmit({ confirmation: 'Distinta123!' })

    expect(await screen.findByText('Las contraseñas ingresadas no coinciden.')).toBeTruthy()
    expect(authApi.resetPassword).not.toHaveBeenCalled()
  })

  it('envía el token y la nueva contraseña y confirma el éxito', async () => {
    authApi.resetPassword.mockResolvedValue({})
    renderReset()

    fillAndSubmit()

    await waitFor(() => expect(authApi.resetPassword).toHaveBeenCalledWith({
      token: 'abc',
      newPassword: 'NuevaClave1!',
    }))
    expect(await screen.findByText('Contraseña actualizada')).toBeTruthy()
    expect(screen.getByText(/sesiones activas fueron cerradas/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Iniciar sesión' }).getAttribute('href')).toBe('/login')
  })

  it('maneja el rechazo de un token inválido o vencido', async () => {
    authApi.resetPassword.mockRejectedValue(new ApiError({
      status: 400,
      code: 'TOKEN_INVALID',
      message: 'El enlace de restablecimiento no es válido.',
    }))
    renderReset()

    fillAndSubmit()

    expect(await screen.findByText('Enlace de restablecimiento inválido o expirado')).toBeTruthy()
  })
})
