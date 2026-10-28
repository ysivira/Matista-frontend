/**
 * ============================================================
 * MATISTA | PRUEBAS DE CONFIRMACIÓN DE CORREO
 * ============================================================
 *
 * Archivo: confirmEmailChangePage.test.jsx
 * Módulo: Pruebas de autenticación
 *
 * Responsabilidad:
 * Probar consumo del enlace, reintentos y descarte de respuestas
 * tras desmontaje, incluido el ciclo de efectos de StrictMode.
 *
 * ============================================================
 */
import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NetworkError } from '../src/shared/lib/httpClient.js'
import { ConfirmEmailChangePage } from '../src/features/auth/pages/ConfirmEmailChangePage.jsx'
import { SessionProvider } from '../src/features/auth/context/SessionProvider.jsx'

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
 * Cliente AUTH inyectable con bootstrap anónimo para el proveedor de sesión real.
 * @returns {object} Doble de pruebas del API AUTH.
 */
function createAnonAuthClient() {
  return {
    getMe: vi.fn().mockRejectedValue(new ApiError({
      status: 401,
      code: 'SESSION_REQUIRED',
      message: 'Debe iniciar sesión.',
    })),
    login: vi.fn(),
    logout: vi.fn(),
  }
}

/**
 * Renderiza la confirmación de cambio de correo con una entrada de historial controlada.
 * @param {string} [entry] Entrada inicial, incluido el fragmento con token.
 * @returns {ReturnType<typeof render>} Resultado de React Testing Library.
 */
function renderConfirmChange(entry = '/confirm-email-change#token=abc') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <SessionProvider authClient={createAnonAuthClient()}>
        <ConfirmEmailChangePage />
      </SessionProvider>
    </MemoryRouter>,
  )
}

describe('ConfirmEmailChangePage', () => {
  beforeEach(() => {
    authApi.confirmEmailChange.mockReset()
  })

  it('no llama al servicio cuando el enlace no trae token', async () => {
    renderConfirmChange('/confirm-email-change')

    expect(await screen.findByText('Enlace de confirmación inválido o expirado')).toBeTruthy()
    expect(authApi.confirmEmailChange).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' }).getAttribute('href'))
      .toBe('/login')
  })

  it('confirma el token y anuncia el nuevo correo activo', async () => {
    authApi.confirmEmailChange.mockResolvedValue({
      code: 'EMAIL_CHANGED',
      oldEmail: 'asesor@example.test',
      newEmail: 'asesor.nuevo@example.test',
    })
    renderConfirmChange()

    expect(await screen.findByText('Correo electrónico actualizado')).toBeTruthy()
    expect(screen.getByText(/asesor.nuevo@example.test/)).toBeTruthy()
    expect(authApi.confirmEmailChange).toHaveBeenCalledWith('abc')
  })

  it('ofrece volver a iniciar sesión cuando el backend rechaza el token', async () => {
    authApi.confirmEmailChange.mockRejectedValue(new ApiError({
      status: 400,
      code: 'TOKEN_INVALID',
      message: 'El enlace de cambio de correo no es válido o ya fue utilizado.',
    }))
    renderConfirmChange()

    expect(await screen.findByText('Enlace de confirmación inválido o expirado')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' }).getAttribute('href'))
      .toBe('/login')
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
  })

  it('reintenta un fallo técnico conservando el token solo en memoria', async () => {
    authApi.confirmEmailChange
      .mockRejectedValueOnce(new NetworkError(new Error('fetch failed')))
      .mockResolvedValueOnce({ code: 'EMAIL_CHANGED' })
    renderConfirmChange()

    const retryButton = await screen.findByRole('button', { name: 'Reintentar' })
    await act(async () => {
      fireEvent.click(retryButton)
    })

    expect(await screen.findByText('Correo electrónico actualizado')).toBeTruthy()
    expect(authApi.confirmEmailChange).toHaveBeenNthCalledWith(2, 'abc')
  })

  it('avisa el retraso del envío como fallo reintentable sin descartar el enlace', async () => {
    authApi.confirmEmailChange.mockRejectedValue(new ApiError({
      status: 503,
      code: 'SECRET_CREATE_FAILED',
      message: 'No se pudo confirmar el cambio en este momento.',
    }))
    renderConfirmChange()

    expect(await screen.findByText('No se pudo confirmar el cambio en este momento.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
  })

  it('lleva a iniciar sesión tras la confirmación correcta', async () => {
    authApi.confirmEmailChange.mockResolvedValue({ code: 'EMAIL_CHANGED' })
    renderConfirmChange()

    await screen.findByText('Correo electrónico actualizado')
    expect(screen.getByRole('link', { name: 'Iniciar sesión' }).getAttribute('href')).toBe('/login')
  })

  it('despacha exactamente una solicitud efectiva durante el ciclo de efectos de StrictMode', async () => {
    authApi.confirmEmailChange.mockResolvedValue({
      code: 'EMAIL_CHANGED',
      oldEmail: 'asesor@example.test',
      newEmail: 'asesor.nuevo@example.test',
    })
    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/confirm-email-change#token=abc']}>
          <SessionProvider authClient={createAnonAuthClient()}>
            <ConfirmEmailChangePage />
          </SessionProvider>
        </MemoryRouter>
      </StrictMode>,
    )

    // El setup repetido del StrictMode no re-despacha: la petición duplicada
    // nunca sale del navegador y la única respuesta vigente (200) gana la vista.
    expect(await screen.findByText('Correo electrónico actualizado')).toBeTruthy()
    expect(screen.getByText(/asesor.nuevo@example.test/)).toBeTruthy()
    expect(authApi.confirmEmailChange).toHaveBeenCalledTimes(1)
    expect(authApi.confirmEmailChange).toHaveBeenCalledWith('abc')
  })

  it('no aplica la respuesta de una confirmación cuyo componente ya se desmontó', async () => {
    let resolver
    authApi.confirmEmailChange.mockImplementationOnce(
      () => new Promise((resolve) => { resolver = resolve }),
    )
    const { unmount } = renderConfirmChange()
    unmount()

    await act(async () => {
      resolver({ code: 'EMAIL_CHANGED', newEmail: 'tardio@example.test' })
      await Promise.resolve()
    })

    expect(authApi.confirmEmailChange).toHaveBeenCalledTimes(1)
  })

  it('conserva el reintento legítimo tras un fallo técnico, incluso bajo StrictMode', async () => {
    authApi.confirmEmailChange
      .mockRejectedValueOnce(new NetworkError(new Error('fetch failed')))
      .mockResolvedValueOnce({ code: 'EMAIL_CHANGED', newEmail: 'asesor.nuevo@example.test' })
    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/confirm-email-change#token=abc']}>
          <SessionProvider authClient={createAnonAuthClient()}>
            <ConfirmEmailChangePage />
          </SessionProvider>
        </MemoryRouter>
      </StrictMode>,
    )

    // El fallo técnico habilita Reintentar; el nuevo intento sí debe despacharse,
    // aunque el guard anti-duplicado ya haya registrado el intento 0 del StrictMode.
    const retryButton = await screen.findByRole('button', { name: 'Reintentar' })
    await act(async () => {
      fireEvent.click(retryButton)
    })
    expect(await screen.findByText('Correo electrónico actualizado')).toBeTruthy()
    expect(authApi.confirmEmailChange).toHaveBeenCalledTimes(2)
  })
})
