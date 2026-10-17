import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NetworkError } from '../src/shared/lib/httpClient.js'
import { VerifyEmailPage } from '../src/features/auth/pages/VerifyEmailPage.jsx'

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
 * Renderiza la confirmación de correo con una entrada de historial controlada.
 * @param {string} [entry] Entrada inicial, incluido el fragmento con token.
 * @returns {ReturnType<typeof render>} Resultado de React Testing Library.
 */
function renderVerify(entry = '/confirm-email#token=abc') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <VerifyEmailPage />
    </MemoryRouter>,
  )
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    authApi.verifyEmail.mockReset()
  })

  it('no llama al servicio cuando el enlace no trae token', async () => {
    renderVerify('/confirm-email')

    expect(await screen.findByText('Enlace de confirmación inválido o expirado')).toBeTruthy()
    expect(authApi.verifyEmail).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Reenviar correo de confirmación' }).getAttribute('href'))
      .toBe('/resend-verification')
  })

  it('confirma el token y anuncia la activación pendiente', async () => {
    authApi.verifyEmail.mockResolvedValue({ code: 'EMAIL_VERIFIED' })
    renderVerify()

    expect(await screen.findByText('Correo electrónico confirmado')).toBeTruthy()
    expect(screen.getByText(/pendiente de activación/)).toBeTruthy()
    expect(authApi.verifyEmail).toHaveBeenCalledWith('abc')
  })

  it('toma el tratamiento estable cuando el correo ya estaba confirmado', async () => {
    authApi.verifyEmail.mockResolvedValue({ code: 'EMAIL_ALREADY_VERIFIED' })
    renderVerify()

    expect(await screen.findByText('El correo ya estaba confirmado')).toBeTruthy()
  })

  it('ofrece reenvío cuando el backend rechaza el token', async () => {
    authApi.verifyEmail.mockRejectedValue(new ApiError({
      status: 400,
      code: 'TOKEN_INVALID',
      message: 'El enlace de verificación no es válido o ya fue utilizado.',
    }))
    renderVerify()

    expect(await screen.findByText('Enlace de confirmación inválido o expirado')).toBeTruthy()
    expect(authApi.verifyEmail).toHaveBeenCalledTimes(1)
  })

  it('reintenta un fallo técnico conservando el token solo en memoria', async () => {
    authApi.verifyEmail
      .mockRejectedValueOnce(new NetworkError(new Error('fetch failed')))
      .mockResolvedValueOnce({ code: 'EMAIL_VERIFIED' })
    renderVerify()

    const retryButton = await screen.findByRole('button', { name: 'Reintentar' })
    await act(async () => {
      fireEvent.click(retryButton)
    })

    expect(await screen.findByText('Correo electrónico confirmado')).toBeTruthy()
    expect(authApi.verifyEmail).toHaveBeenNthCalledWith(2, 'abc')
  })

  it('lleva a iniciar sesión tras la confirmación correcta', async () => {
    authApi.verifyEmail.mockResolvedValue({ code: 'EMAIL_VERIFIED' })
    renderVerify()

    await screen.findByText('Correo electrónico confirmado')
    expect(screen.getByRole('link', { name: 'Iniciar sesión' }).getAttribute('href')).toBe('/login')
  })
})
