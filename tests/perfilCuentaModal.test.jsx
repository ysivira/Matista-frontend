import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminLayout } from '../src/features/admin/components/AdminLayout.jsx'
import { authApi } from '../src/features/auth/api/authApi.js'
import { SessionContext } from '../src/features/auth/context/SessionContext.js'
import { ApiError } from '../src/shared/lib/httpClient.js'

vi.mock('../src/features/auth/api/authApi.js', () => ({
  authApi: { changePassword: vi.fn(), changeEmail: vi.fn() },
}))

/** Sesión ADMIN sintética para la tarjeta de usuario de la barra lateral. */
function seededSession(userExtra = {}) {
  return {
    status: 'authenticated', error: null,
    user: { legajo: '0000000001', rol: 'ADMIN', estado: 'ACTIVO', nombre: 'Dana', apellido: 'Garcia', email: 'dana@matista.test', ...userExtra },
  }
}

/** Renderiza el shell ADMIN con la sesión provista. */
function renderShell(session = seededSession()) {
  return render(
    <SessionContext.Provider value={session}>
      <MemoryRouter initialEntries={['/admin']}>
        <AdminLayout section="Directorio de empleados">
          <p>Contenido de prueba</p>
        </AdminLayout>
      </MemoryRouter>
    </SessionContext.Provider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('modal de cuenta desde la tarjeta de usuario (SL-1)', () => {
  it('abre el modal con los datos reales de la sesión sin exponer credenciales', async () => {
    renderShell()

    fireEvent.click(screen.getByRole('button', { name: 'Mi perfil' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Mi perfil' })
    expect(screen.getAllByText('Dana Garcia').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/dana@matista\.test/).length).toBeGreaterThan(0)
    expect(dialogo.textContent).toContain('Cambiar contraseña')
    expect(dialogo.textContent).toContain('Cambiar correo')
    expect(screen.queryByText(/password/)).toBeNull()
  })

  it('cambia la contraseña desde el modal con el DTO del contrato', async () => {
    authApi.changePassword.mockResolvedValue({})
    renderShell()

    fireEvent.click(screen.getByRole('button', { name: 'Mi perfil' }))
    // La vista inicial muestra solo datos y opciones; el formulario aparece al elegirla.
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
    fireEvent.change(document.querySelector('#perfil-modal-current-password'), { target: { value: 'vieja1234' } })
    fireEvent.change(document.querySelector('#perfil-modal-new-password'), { target: { value: 'nueva1234' } })
    fireEvent.change(document.querySelector('#perfil-modal-confirm-password'), { target: { value: 'nueva1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    await waitFor(() => expect(authApi.changePassword).toHaveBeenCalledWith({
      currentPassword: 'vieja1234', newPassword: 'nueva1234',
    }))
    expect(await screen.findByText('Contraseña actualizada')).toBeTruthy()
  })

  it('traduce el rechazo sensible de correo sin datos técnicos', async () => {
    authApi.changeEmail.mockRejectedValue(new ApiError({
      status: 409, code: 'CURRENT_PASSWORD_INVALID', message: 'La contraseña actual no es correcta.',
    }))
    renderShell()

    fireEvent.click(screen.getByRole('button', { name: 'Mi perfil' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar correo' }))
    fireEvent.change(document.querySelector('#perfil-modal-new-email'), { target: { value: 'nuevo@matista.test' } })
    fireEvent.change(document.querySelector('#perfil-modal-email-password'), { target: { value: 'malclave' } })
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar cambio de correo' }))

    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeTruthy()
  })
})
