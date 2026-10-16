import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RouterProvider } from 'react-router-dom'
import { createMemoryAppRouter } from '../src/app/router.jsx'
import { SessionContext } from '../src/features/auth/context/SessionContext.js'

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
  it('resuelve una ruta pública sin sesión', async () => {
    renderRoute('/', anonymousSession)

    expect(await screen.findByText('Infraestructura frontend AUTH')).toBeTruthy()
  })

  it('redirige una ruta privada al acceso provisional cuando no hay sesión', async () => {
    renderRoute('/asesor', anonymousSession)

    expect(await screen.findByText('Acceso AUTH pendiente de D.3')).toBeTruthy()
  })

  it('permite el destino compatible con el rol activo', async () => {
    renderRoute('/asesor', {
      status: 'authenticated',
      user: { rol: 'ASESOR', estado: 'ACTIVO' },
      error: null,
    })

    expect(await screen.findByText('Destino ASESOR')).toBeTruthy()
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
})
