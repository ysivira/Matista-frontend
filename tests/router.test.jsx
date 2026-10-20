import { cleanup, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RouterProvider } from 'react-router-dom'
import { createMemoryAppRouter } from '../src/app/router.jsx'
import { SessionContext } from '../src/features/auth/context/SessionContext.js'

vi.mock('../src/features/auth/api/authApi.js', () => ({
  authApi: {
    register: vi.fn().mockResolvedValue({}),
    verifyEmail: vi.fn().mockResolvedValue({ code: 'EMAIL_VERIFIED' }),
    resendVerification: vi.fn().mockResolvedValue({}),
    login: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn().mockResolvedValue({}),
    resetPassword: vi.fn(),
    getMe: vi.fn(),
    updateMe: vi.fn(),
    changePassword: vi.fn(),
    changeEmail: vi.fn(),
    confirmEmailChange: vi.fn(),
  },
}))

/**
 * Renderiza una ruta con un estado de sesión explícito para probar guards sin red.
 * @param {string} path Ruta inicial.
 * @param {object} session Estado de sesión inyectado.
 * @returns {ReturnType<typeof render>} Resultado de React Testing Library.
 */
function renderRoute(path, session) {
  const router = createMemoryAppRouter([path])
  return render(
    <SessionContext.Provider value={session}>
      <RouterProvider router={router} />
    </SessionContext.Provider>,
  )
}

const anonymousSession = {
  status: 'anonymous',
  user: null,
  error: null,
}

describe('router y guards', () => {
  it('redirige la raíz a la pantalla de login sin sesión', async () => {
    renderRoute('/', anonymousSession)

    expect(await screen.findByText('Iniciar Sesión')).toBeTruthy()
  })

  it('mantiene la carga de sesión al abrir la raíz', async () => {
    renderRoute('/', {
      status: 'checking',
      user: null,
      error: null,
    })

    expect(await screen.findByText('Verificando sesión...')).toBeTruthy()
  })

  it('conserva el tratamiento de error con reintento al abrir la raíz', async () => {
    renderRoute('/', {
      status: 'error',
      user: null,
      error: new Error('Sin conexión'),
      refreshSession: () => Promise.resolve(null),
    })

    expect(await screen.findByText('No se pudo verificar la sesión')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
  })

  it('redirige la raíz al destino por rol cuando hay sesión activa', async () => {
    renderRoute('/', {
      status: 'authenticated',
      user: { rol: 'ADMIN', estado: 'ACTIVO' },
      error: null,
    })

    expect(await screen.findByRole('heading', { name: 'Gestión de empleados' })).toBeTruthy()
  })

  it('redirige la raíz al destino del asesor con ese rol', async () => {
    renderRoute('/', {
      status: 'authenticated',
      user: { rol: 'ASESOR', estado: 'ACTIVO' },
      error: null,
    })

    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeTruthy()
  })

  it('redirige una ruta privada a la pantalla de login cuando no hay sesión', async () => {
    renderRoute('/asesor', anonymousSession)

    expect(await screen.findByText('Iniciar Sesión')).toBeTruthy()
  })

  it('permite el destino compatible con el rol activo', async () => {
    renderRoute('/asesor', {
      status: 'authenticated',
      user: { rol: 'ASESOR', estado: 'ACTIVO' },
      error: null,
    })

    expect(await screen.findByRole('heading', { name: 'Mi perfil' })).toBeTruthy()
  })

  it('impide presentar una ruta incompatible con el rol', async () => {
    renderRoute('/admin', {
      status: 'authenticated',
      user: { rol: 'ASESOR', estado: 'ACTIVO' },
      error: null,
    })

    expect(await screen.findByText('Acceso no autorizado')).toBeTruthy()
  })

  it('impide presentar rutas privadas a una cuenta no activa', async () => {
    renderRoute('/asesor', {
      status: 'authenticated',
      user: { rol: 'ASESOR', estado: 'PENDIENTE' },
      error: null,
    })

    expect(await screen.findByText('Cuenta no disponible')).toBeTruthy()
  })

  it('mantiene el estado de carga antes de decidir una ruta privada', async () => {
    renderRoute('/asesor', {
      status: 'checking',
      user: null,
      error: null,
    })

    expect(await screen.findByText('Verificando sesión...')).toBeTruthy()
  })

  it('no confunde un fallo técnico con una sesión anónima', async () => {
    renderRoute('/asesor', {
      status: 'error',
      user: null,
      error: new Error('Sin conexión'),
      refreshSession: () => Promise.resolve(null),
    })

    expect(await screen.findByText('No se pudo verificar la sesión')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
  })

  it('expone las pantallas públicas de autenticación de D.3', async () => {
    const publicExpectations = [
      { entry: '/register', heading: 'Crear Cuenta' },
      { entry: '/resend-verification', heading: 'Reenviar verificación' },
      { entry: '/forgot-password', heading: 'Recuperar Contraseña' },
      { entry: '/reset-password#token=abc', heading: 'Restablecer Contraseña' },
      { entry: '/confirm-email#token=abc', heading: 'Confirmación de correo' },
      { entry: '/confirm-email-change#token=abc', heading: 'Confirmación de cambio de correo' },
    ]

    for (const expectation of publicExpectations) {
      renderRoute(expectation.entry, anonymousSession)
      expect(await screen.findByRole('heading', { name: expectation.heading })).toBeTruthy()
      cleanup()
    }
  })
})
