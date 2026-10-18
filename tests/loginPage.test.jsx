import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/shared/lib/httpClient.js'
import { LoginPage } from '../src/features/auth/pages/LoginPage.jsx'
import { SessionProvider } from '../src/features/auth/context/SessionProvider.jsx'
import { RoutePlaceholder } from '../src/app/PlaceholderPages.jsx'
import { TemporaryAccountPage } from '../src/features/auth/pages/TemporaryAccountPage.jsx'
import { ProtectedRoute } from '../src/features/auth/components/ProtectedRoute.jsx'

/**
 * Cliente AUTH inyectable con bootstrap anónimo y login programable.
 * @param {object} [overrides] Sustituciones específicas por prueba.
 * @returns {object} Doble de pruebas del API AUTH.
 */
function createAuthClient(overrides = {}) {
  return {
    getMe: vi.fn().mockRejectedValue(new ApiError({
      status: 401,
      code: 'SESSION_REQUIRED',
      message: 'Debe iniciar sesión.',
    })),
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  }
}

/**
 * Renderiza la pantalla de login con el proveedor de sesión real y los destinos por rol de D.2.
 * @param {object} authClient Doble del API AUTH inyectado.
 * @param {Array<string|object>} [initialEntries] Entradas iniciales del historial.
 * @returns {ReturnType<typeof render>} Resultado de React Testing Library.
 */
function renderLoginPage(authClient, initialEntries = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <SessionProvider authClient={authClient}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/asesor" element={<TemporaryAccountPage />} />
          <Route path="/admin" element={<TemporaryAccountPage />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  )
}

/**
 * Completa el formulario con credenciales válidas y lo envía.
 * @param {object} credentials Credenciales a digitar.
 * @returns {void}
 */
function fillAndSubmit({ email = 'asesor@example.test', password = 'Segura123!' } = {}) {
  fireEvent.change(screen.getByLabelText(/Correo electrónico/), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
}

describe('LoginPage', () => {
  it('valida los campos obligatorios antes de llamar al servicio', async () => {
    const authClient = createAuthClient()
    renderLoginPage(authClient)

    expect(await screen.findByText('Iniciar Sesión')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(screen.getAllByText('Este campo es obligatorio.')).toHaveLength(2)
    expect(authClient.login).not.toHaveBeenCalled()
  })

  it('valida el formato del correo y no envía credenciales inválidas', async () => {
    const authClient = createAuthClient()
    renderLoginPage(authClient)

    await screen.findByText('Iniciar Sesión')
    fillAndSubmit({ email: 'correo-invalido' })

    expect(screen.getByText('Ingresa un correo electrónico válido.')).toBeTruthy()
    expect(authClient.login).not.toHaveBeenCalled()
  })

  it('previene envíos duplicados mientras la autenticación está pendiente', async () => {
    let resolveLogin
    const authClient = createAuthClient({
      login: vi.fn().mockImplementation(() => new Promise((resolve) => {
        resolveLogin = resolve
      })),
    })
    renderLoginPage(authClient)

    await screen.findByText('Iniciar Sesión')
    fillAndSubmit()
    await waitFor(() => expect(authClient.login).toHaveBeenCalledTimes(1))

    // El botón queda deshabilitado durante el envío: un nuevo clic no repite el POST.
    fireEvent.click(screen.getByRole('button', { name: 'Ingresando...' }))

    await act(async () => {
      resolveLogin({ user: { rol: 'ASESOR', estado: 'ACTIVO', email: 'asesor@example.test' } })
    })

    expect(await screen.findByText('Cuenta ASESOR')).toBeTruthy()
    expect(authClient.login).toHaveBeenCalledTimes(1)
  })

  it('presenta credenciales inválidas sin navegar', async () => {
    const authClient = createAuthClient({
      login: vi.fn().mockRejectedValue(new ApiError({
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Correo o contraseña incorrectos.',
      })),
    })
    renderLoginPage(authClient)

    await screen.findByText('Iniciar Sesión')
    fillAndSubmit()

    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeTruthy()
    expect(screen.getByText('Iniciar Sesión')).toBeTruthy()
  })

  it('ofrece reenvío de verificación cuando el correo no está confirmado', async () => {
    const authClient = createAuthClient({
      login: vi.fn().mockRejectedValue(new ApiError({
        status: 403,
        code: 'EMAIL_VERIFICATION_REQUIRED',
        message: 'Debes verificar tu correo antes de iniciar sesión.',
      })),
    })
    renderLoginPage(authClient)

    await screen.findByText('Iniciar Sesión')
    fillAndSubmit()

    expect(await screen.findByText('Verifica tu correo electrónico')).toBeTruthy()
    const resendLink = screen.getByRole('link', { name: 'Reenviar correo de verificación' })
    expect(resendLink.getAttribute('href')).toBe('/resend-verification')
  })

  it('muestra el tratamiento específico de una cuenta pendiente de aprobación', async () => {
    const authClient = createAuthClient({
      login: vi.fn().mockRejectedValue(new ApiError({
        status: 403,
        code: 'ACCOUNT_PENDING_APPROVAL',
        message: 'Tu cuenta está a la espera de ser habilitada por un administrador.',
      })),
    })
    renderLoginPage(authClient)

    await screen.findByText('Iniciar Sesión')
    fillAndSubmit()

    expect(await screen.findByText('Cuenta pendiente de aprobación')).toBeTruthy()
    expect(authClient.login).toHaveBeenCalledTimes(1)
  })

  it('avisa con tono accesible cuando el login alcanza el límite de solicitudes', async () => {
    // El contrato confirma RATE_LIMIT_EXCEEDED/429 para login (5 por 15 minutos) sin Retry-After.
    const authClient = createAuthClient({
      login: vi.fn().mockRejectedValue(new ApiError({
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Demasiadas solicitudes. Intente más tarde.',
      })),
    })
    renderLoginPage(authClient)

    await screen.findByText('Iniciar Sesión')
    fillAndSubmit()

    expect(await screen.findByText('Demasiados intentos')).toBeTruthy()
    expect(screen.getByText('Demasiadas solicitudes. Intente más tarde.')).toBeTruthy()
    expect(screen.getByText('Iniciar Sesión')).toBeTruthy()
  })

  it('notifica una cuenta no habilitada por el backend', async () => {
    const authClient = createAuthClient({
      login: vi.fn().mockRejectedValue(new ApiError({
        status: 403,
        code: 'ACCOUNT_NOT_ACTIVE',
        message: 'Tu cuenta se encuentra desactivada.',
      })),
    })
    renderLoginPage(authClient)

    await screen.findByText('Iniciar Sesión')
    fillAndSubmit()

    expect(await screen.findByText('Cuenta no habilitada')).toBeTruthy()
  })

  it('navega al destino del rol tras iniciar sesión', async () => {
    const authClient = createAuthClient({
      login: vi.fn().mockResolvedValue({
        user: { rol: 'ASESOR', estado: 'ACTIVO', email: 'asesor@example.test' },
      }),
    })
    renderLoginPage(authClient)

    await screen.findByText('Iniciar Sesión')
    fillAndSubmit()

    expect(await screen.findByText('Cuenta ASESOR')).toBeTruthy()
  })

  /**
   * Renderiza el login con las rutas protegidas reales (guard por rol) y la entrada
   * inicial de historial indicada, para probar transiciones de sesión entre roles.
   * @param {object} authClient Doble del API AUTH.
   * @param {string|object} initialEntry Entrada inicial: path o parcial con state.
   * @returns {void}
   */
  function renderLoginWithGuards(authClient, initialEntry = '/login') {
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <SessionProvider authClient={authClient}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {/* Guard real: el anónimo expulsa a /login conservando el path en el estado. */}
            <Route path="/asesor" element={<ProtectedRoute allowedRoles={['ASESOR']} />}>
              <Route path="" element={<TemporaryAccountPage />} />
            </Route>
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="" element={<TemporaryAccountPage />} />
            </Route>
            <Route
              path="/access-denied"
              element={(
                <RoutePlaceholder
                  eyebrow="Autorización"
                  title="Acceso no autorizado"
                  description="La ruta solicitada no corresponde al rol de la sesión."
                />
              )}
            />
          </Routes>
        </SessionProvider>
      </MemoryRouter>,
    )
  }

  it('lleva al ADMIN a su destino pese a un retorno incompatible de la sesión anterior', async () => {
    const authClient = createAuthClient({
      login: vi.fn().mockResolvedValue({
        user: { rol: 'ADMIN', estado: 'ACTIVO', email: 'admin@example.test' },
      }),
    })
    // Flujo ASESOR → logout en /asesor → login ADMIN: el guard anónimo redirige a /login
    // con `from=/asesor`; el nuevo login debe descartarlo e ir al destino del rol /admin.
    renderLoginWithGuards(authClient, '/asesor')

    await screen.findByText('Iniciar Sesión')
    fillAndSubmit()

    expect(await screen.findByText('Cuenta ADMIN')).toBeTruthy()
  })

  it('lleva al ASESOR a su destino pese a un retorno incompatible de la sesión anterior', async () => {
    const authClient = createAuthClient({
      login: vi.fn().mockResolvedValue({
        user: { rol: 'ASESOR', estado: 'ACTIVO', email: 'asesor@example.test' },
      }),
    })
    renderLoginWithGuards(authClient, '/admin')

    await screen.findByText('Iniciar Sesión')
    fillAndSubmit()

    expect(await screen.findByText('Cuenta ASESOR')).toBeTruthy()
  })

  it('conserva el retorno legítimo del propio rol', async () => {
    const authClient = createAuthClient({
      login: vi.fn().mockResolvedValue({
        user: { rol: 'ASESOR', estado: 'ACTIVO', email: 'asesor@example.test' },
      }),
    })
    renderLoginWithGuards(authClient, '/asesor')

    await screen.findByText('Iniciar Sesión')
    fillAndSubmit()

    expect(await screen.findByText('Cuenta ASESOR')).toBeTruthy()
  })

  it('conserva el retorno legítimo del rol ADMIN', async () => {
    const authClient = createAuthClient({
      login: vi.fn().mockResolvedValue({
        user: { rol: 'ADMIN', estado: 'ACTIVO', email: 'admin@example.test' },
      }),
    })
    renderLoginWithGuards(authClient, '/admin')

    await screen.findByText('Iniciar Sesión')
    fillAndSubmit()

    expect(await screen.findByText('Cuenta ADMIN')).toBeTruthy()
  })

  it('descarta el retorno externo, público o no reconocido del estado de navegación', async () => {
    const authClient = createAuthClient({
      login: vi.fn().mockResolvedValue({
        user: { rol: 'ADMIN', estado: 'ACTIVO', email: 'admin@example.test' },
      }),
    })
    // `from` manipulable del historial: URL externa y path parecido no autorizado.
    renderLoginWithGuards(authClient, {
      pathname: '/login',
      state: { from: 'https://externo.test/admin-otra' },
    })

    await screen.findByText('Iniciar Sesión')
    fillAndSubmit()

    expect(await screen.findByText('Cuenta ADMIN')).toBeTruthy()
  })

  it('mantiene el acceso directo negado a la ruta privada de otro rol', async () => {
    const authClient = createAuthClient({
      getMe: vi.fn().mockResolvedValue({
        user: { rol: 'ADMIN', estado: 'ACTIVO', email: 'admin@example.test' },
      }),
    })
    renderLoginWithGuards(authClient, '/asesor')

    expect(await screen.findByText('Acceso no autorizado')).toBeTruthy()
    expect(authClient.login).not.toHaveBeenCalled()
  })

  it('redirige al destino del rol cuando la sesión ya está activa', async () => {
    const authClient = createAuthClient({
      getMe: vi.fn().mockResolvedValue({
        user: { rol: 'ASESOR', estado: 'ACTIVO', email: 'asesor@example.test' },
      }),
    })
    renderLoginPage(authClient)

    expect(await screen.findByText('Cuenta ASESOR')).toBeTruthy()
    expect(authClient.login).not.toHaveBeenCalled()
  })
})
