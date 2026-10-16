import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SessionProvider } from '../src/features/auth/context/SessionProvider.jsx'
import { useSession } from '../src/features/auth/hooks/useSession.js'
import { ApiError } from '../src/shared/lib/httpClient.js'

/**
 * Expone estado y usuario para observar el proveedor sin construir una pantalla AUTH.
 * @returns {import('react').ReactElement} Sonda de prueba de la sesión.
 */
function SessionProbe() {
  const { status, user, error, login } = useSession()
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="role">{user?.rol ?? 'sin-usuario'}</span>
      <span data-testid="error">{error?.name ?? 'sin-error'}</span>
      <button
        type="button"
        onClick={() => void login({ email: 'admin@example.test', password: 'secreto' }).catch(() => undefined)}
      >
        Iniciar sesión de prueba
      </button>
    </div>
  )
}

/**
 * Sonda que dispara mutaciones de sesión en paralelo para verificar la unicidad obligatoria.
 * @param {object} props Propiedades de la sonda.
 * @param {(entry: {name: string, result: unknown}) => void} props.onResult
 *   Callback invocado con el nombre y el resultado de cada operación al resolverse.
 * @returns {import('react').ReactElement} Botón que lanza login, login duplicado y logout en paralelo.
 */
function ConcurrentMutationProbe({ onResult }) {
  const { login, logout, status } = useSession()
  return (
    <div>
      <span data-testid="status">{status}</span>
      <button
        type="button"
        onClick={() => {
          void login({ email: 'admin@example.test', password: 'secreto' })
            .then((user) => onResult({ name: 'firstLogin', result: user }))
            .catch((error) => onResult({ name: 'firstLogin', result: error }))
          void login({ email: 'asesor@example.test', password: 'secreto' })
            .then((user) => onResult({ name: 'secondLogin', result: user }))
            .catch((error) => onResult({ name: 'secondLogin', result: error }))
          void logout()
            .then(() => onResult({ name: 'logout', result: null }))
            .catch((error) => onResult({ name: 'logout', result: error }))
        }}
      >
        Iniciar mutaciones paralelas
      </button>
    </div>
  )
}

/**
 * Crea una promesa controlable para verificar el orden de operaciones asíncronas.
 * @returns {{promise: Promise<unknown>, resolve: Function}} Promesa y función de resolución.
 */
function deferredPromise() {
  let resolve
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

describe('SessionProvider', () => {
  it('recupera el usuario mediante /me y lo conserva solo en memoria', async () => {
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem')
    const user = { rol: 'ASESOR', estado: 'ACTIVO', email: 'asesor@example.test' }
    const authClient = {
      getMe: vi.fn().mockResolvedValue({ user }),
      login: vi.fn(),
      logout: vi.fn(),
    }

    render(
      <SessionProvider authClient={authClient}>
        <SessionProbe />
      </SessionProvider>,
    )

    expect(screen.getByTestId('status').textContent).toBe('checking')
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'))
    expect(screen.getByTestId('role').textContent).toBe('ASESOR')
    expect(authClient.getMe).toHaveBeenCalledTimes(1)
    expect(storageSpy).not.toHaveBeenCalled()
    storageSpy.mockRestore()
  })

  it('trata SESSION_REQUIRED como ausencia normal de sesión', async () => {
    const authClient = {
      getMe: vi.fn().mockRejectedValue(new ApiError({
        status: 401,
        code: 'SESSION_REQUIRED',
        message: 'Debe iniciar sesión.',
      })),
      login: vi.fn(),
      logout: vi.fn(),
    }

    render(
      <SessionProvider authClient={authClient}>
        <SessionProbe />
      </SessionProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('anonymous'))
    expect(screen.getByTestId('role').textContent).toBe('sin-usuario')
    expect(screen.getByTestId('error').textContent).toBe('sin-error')
  })

  it('distingue un error de red de la ausencia de sesión', async () => {
    const authClient = {
      getMe: vi.fn().mockRejectedValue(new Error('Sin conexión')),
      login: vi.fn(),
      logout: vi.fn(),
    }

    render(
      <SessionProvider authClient={authClient}>
        <SessionProbe />
      </SessionProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('error'))
    expect(screen.getByTestId('error').textContent).toBe('Error')
  })

  it('impide que un bootstrap atrasado sobrescriba un login posterior', async () => {
    const bootstrap = deferredPromise()
    const authClient = {
      getMe: vi.fn().mockReturnValue(bootstrap.promise),
      login: vi.fn().mockResolvedValue({
        user: { rol: 'ADMIN', estado: 'ACTIVO', email: 'admin@example.test' },
      }),
      logout: vi.fn(),
    }

    render(
      <SessionProvider authClient={authClient}>
        <SessionProbe />
      </SessionProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión de prueba' }))
    await waitFor(() => expect(screen.getByTestId('role').textContent).toBe('ADMIN'))

    await act(async () => {
      bootstrap.resolve({ user: { rol: 'ASESOR', estado: 'ACTIVO' } })
      await bootstrap.promise
    })

    expect(screen.getByTestId('status').textContent).toBe('authenticated')
    expect(screen.getByTestId('role').textContent).toBe('ADMIN')
  })

  it('restaura un estado estable cuando el login falla durante el bootstrap', async () => {
    const bootstrap = deferredPromise()
    const authClient = {
      getMe: vi.fn().mockReturnValue(bootstrap.promise),
      login: vi.fn().mockRejectedValue(new ApiError({
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Credenciales inválidas.',
      })),
      logout: vi.fn(),
    }

    render(
      <SessionProvider authClient={authClient}>
        <SessionProbe />
      </SessionProvider>,
    )

    expect(screen.getByTestId('status').textContent).toBe('checking')
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión de prueba' }))

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('anonymous'))
    expect(screen.getByTestId('error').textContent).toBe('ApiError')

    await act(async () => {
      bootstrap.resolve({ user: { rol: 'ASESOR', estado: 'ACTIVO' } })
      await bootstrap.promise
    })

    expect(screen.getByTestId('status').textContent).toBe('anonymous')
  })

  it('rechaza mutaciones de sesión concurrentes hasta que la primera termina', async () => {
    const mutationResults = []
    const pendingLogin = deferredPromise()
    const authClient = {
      getMe: vi.fn().mockRejectedValue(new ApiError({
        status: 401,
        code: 'SESSION_REQUIRED',
        message: 'Debe iniciar sesión.',
      })),
      login: vi.fn().mockReturnValue(pendingLogin.promise),
      logout: vi.fn().mockRejectedValue(new Error('El logout no debía ejecutarse.')),
    }

    render(
      <SessionProvider authClient={authClient}>
        <ConcurrentMutationProbe onResult={(entry) => { mutationResults.push(entry) }} />
      </SessionProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar mutaciones paralelas' }))

    await waitFor(() => expect(mutationResults).toHaveLength(2))
    expect(mutationResults.map((entry) => entry.name)).toEqual(['secondLogin', 'logout'])
    mutationResults.forEach((entry) => {
      expect(entry.result).toBeInstanceOf(Error)
      expect(entry.result.message).toBe('Ya existe una operación de inicio o cierre de sesión en curso.')
    })
    expect(authClient.logout).not.toHaveBeenCalled()

    await act(async () => {
      pendingLogin.resolve({ user: { rol: 'ASESOR', estado: 'ACTIVO', email: 'asesor@example.test' } })
      await pendingLogin.promise
    })

    await waitFor(() => expect(mutationResults).toHaveLength(3))
    expect(mutationResults[2].name).toBe('firstLogin')
    expect(mutationResults[2].result).toMatchObject({ rol: 'ASESOR' })
    expect(screen.getByTestId('status').textContent).toBe('authenticated')
    expect(authClient.login).toHaveBeenCalledTimes(1)
  })
})
