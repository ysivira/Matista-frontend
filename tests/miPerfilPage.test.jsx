import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MiPerfilPage } from '../src/features/perfil/pages/MiPerfilPage.jsx'
import { SessionLayout } from '../src/app/SessionLayout.jsx'
import { authApi } from '../src/features/auth/api/authApi.js'
import { SessionContext } from '../src/features/auth/context/SessionContext.js'
import { ApiError } from '../src/shared/lib/httpClient.js'

vi.mock('../src/features/auth/api/authApi.js', () => ({
  authApi: { changePassword: vi.fn(), changeEmail: vi.fn() },
}))

/** Sesión AUTH sintética compartida por ADMIN y ASESOR. */
function seededSession(userExtra = {}) {
  return {
    status: 'authenticated', error: null,
    user: { legajo: '0000000001', rol: 'ADMIN', estado: 'ACTIVO', nombre: 'Dana', apellido: 'Garcia', email: 'dana@matista.test', ...userExtra },
  }
}

/** Renderiza el perfil con sesión explícita y router en memoria. */
function renderPerfil(session = seededSession()) {
  return render(
    <SessionContext.Provider value={session}>
      <MemoryRouter initialEntries={['/perfil']}>
        <SessionLayout section="Mi perfil"><MiPerfilPage /></SessionLayout>
      </MemoryRouter>
    </SessionContext.Provider>,
  )
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Mi perfil compartido (SL-1)', () => {
  it('muestra la identidad real de la sesión sin credenciales', () => {
    renderPerfil()

    expect(screen.getByRole('heading', { name: 'Mi perfil' })).toBeTruthy()
    expect(screen.getAllByText('Dana Garcia').length).toBeGreaterThan(0)
    expect(screen.getAllByText('dana@matista.test').length).toBeGreaterThan(0)
    expect(screen.getByText('0000000001')).toBeTruthy()
    expect(screen.queryByText(/password/)).toBeNull()
  })

  it('cambia la contraseña con el DTO del contrato y confirma el cierre global', async () => {
    authApi.changePassword.mockResolvedValue({})
    renderPerfil()

    fireEvent.change(screen.getByLabelText(/^Contraseña actual/, { selector: '#perfil-current-password' }), { target: { value: 'vieja1234' } })
    fireEvent.change(screen.getByLabelText(/^Nueva contraseña/, { selector: '#perfil-new-password' }), { target: { value: 'nueva1234' } })
    fireEvent.change(screen.getByLabelText(/^Confirmar nueva contraseña/, { selector: '#perfil-confirm-password' }), { target: { value: 'nueva1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    await waitFor(() => expect(authApi.changePassword).toHaveBeenCalledWith({
      currentPassword: 'vieja1234', newPassword: 'nueva1234',
    }))
    expect(await screen.findByText('Contraseña actualizada')).toBeTruthy()
  })

  it('no envía el cambio si la confirmación no coincide', () => {
    renderPerfil()

    fireEvent.change(screen.getByLabelText(/^Contraseña actual/, { selector: '#perfil-current-password' }), { target: { value: 'vieja1234' } })
    fireEvent.change(screen.getByLabelText(/^Nueva contraseña/, { selector: '#perfil-new-password' }), { target: { value: 'nueva1234' } })
    fireEvent.change(screen.getByLabelText(/^Confirmar nueva contraseña/, { selector: '#perfil-confirm-password' }), { target: { value: 'otra1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(screen.getByText('Las contraseñas ingresadas no coinciden.')).toBeTruthy()
    expect(authApi.changePassword).not.toHaveBeenCalled()
  })

  it('solicita cambio de correo sin revocar la sesión vigente', async () => {
    authApi.changeEmail.mockResolvedValue({ verificationDelivery: 'ACCEPTED' })
    renderPerfil(seededSession({ rol: 'ASESOR' }))

    fireEvent.change(screen.getByLabelText(/^Correo nuevo/, { selector: '#perfil-new-email' }), { target: { value: 'nuevocorreo@matista.test' } })
    fireEvent.change(screen.getByLabelText(/^Contraseña actual/, { selector: '#perfil-email-password' }), { target: { value: 'clave1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar cambio de correo' }))

    await waitFor(() => expect(authApi.changeEmail).toHaveBeenCalledWith({
      email: 'nuevocorreo@matista.test', currentPassword: 'clave1234',
    }))
    expect(await screen.findByText('Solicitud de cambio de correo recibida')).toBeTruthy()
  })

  it('traduce el rechazo sensible de credenciales sin datos técnicos', async () => {
    authApi.changeEmail.mockRejectedValue(new ApiError({
      status: 409, code: 'CURRENT_PASSWORD_INVALID', message: 'La contraseña actual no es correcta.',
    }))
    renderPerfil()

    fireEvent.change(screen.getByLabelText(/^Correo nuevo/, { selector: '#perfil-new-email' }), { target: { value: 'nuevocorreo@matista.test' } })
    fireEvent.change(screen.getByLabelText(/^Contraseña actual/, { selector: '#perfil-email-password' }), { target: { value: 'malclave' } })
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar cambio de correo' }))

    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeTruthy()
  })
})
