/**
 * ============================================================
 * MATISTA | PRUEBAS DE RECUPERACIÓN DE CONTRASEÑA
 * ============================================================
 *
 * Archivo: forgotPasswordPage.test.jsx
 * Módulo: Pruebas de autenticación
 *
 * Responsabilidad:
 * Probar el loading compartido durante la solicitud de
 * recuperación, el bloqueo de solicitudes duplicadas y el
 * mensaje neutral sin revelar si el correo está registrado.
 *
 * ============================================================
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

/** Renderiza la página de recuperación con la API de AUTH simulada. */
function renderForgot() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <ForgotPasswordPage />
    </MemoryRouter>,
  )
}

/** Completa el email y envía el formulario. */
function fillAndSubmit(email = 'usuario@example.test') {
  const input = screen.getByLabelText(/email/i)
  fireEvent.change(input, { target: { value: email } })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))
}

describe('ForgotPasswordPage con loading compartido', () => {
  beforeEach(() => {
    authApi.forgotPassword.mockReset()
  })

  it('muestra el loading compartido mientras se procesa la solicitud', async () => {
    let resolver
    authApi.forgotPassword.mockImplementation(() => new Promise(resolve => {
      resolver = resolve
    }))
    renderForgot()

    fillAndSubmit()

    // El loading debe aparecer inmediatamente al enviar.
    await waitFor(() => expect(screen.getByText('Estamos procesando tu solicitud')).toBeTruthy())
    expect(authApi.forgotPassword).toHaveBeenCalledTimes(1)
    expect(authApi.forgotPassword).toHaveBeenCalledWith('usuario@example.test')

    // Al resolver, el loading se oculta y aparece la confirmación.
    resolver({})
    await waitFor(() => expect(screen.getByText('Solicitud enviada con éxito')).toBeTruthy())
    expect(screen.queryByText('Estamos procesando tu solicitud')).toBeNull()
  })

  it('oculta el loading cuando la operación termina con error', async () => {
    let resolver
    authApi.forgotPassword.mockImplementation(() => new Promise(resolve => {
      resolver = resolve
    }))
    renderForgot()

    fillAndSubmit()

    await waitFor(() => expect(screen.getByText('Estamos procesando tu solicitud')).toBeTruthy())
    resolver(new Error('Fallo simulado'))
    await waitFor(() => expect(screen.queryByText('Estamos procesando tu solicitud')).toBeNull())
  })

  it('no envía solicitudes duplicadas mientras está procesando', async () => {
    let resolver
    authApi.forgotPassword.mockImplementation(() => new Promise(resolve => {
      resolver = resolve
    }))
    renderForgot()

    fillAndSubmit('usuario@example.test')
    await waitFor(() => expect(screen.getByText('Estamos procesando tu solicitud')).toBeTruthy())

    // El botón pasa a estado deshabilitado y cambia su etiqueta mientras se procesa.
    const boton = screen.getByRole('button')
    expect(boton.disabled).toBe(true)
    expect(boton.textContent).toBe('Enviando...')

    // Intento de envío concurrente: el botón deshabilitado no dispara una nueva solicitud.
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'otro@example.test' } })
    fireEvent.click(boton)

    expect(authApi.forgotPassword).toHaveBeenCalledTimes(1)
    expect(authApi.forgotPassword).toHaveBeenCalledWith('usuario@example.test')

    resolver({})
    await waitFor(() => expect(screen.getByText('Solicitud enviada con éxito')).toBeTruthy())
  })

  it('mantiene el mensaje neutral sin revelar si el correo está registrado', async () => {
    authApi.forgotPassword.mockResolvedValue({})
    renderForgot()

    fillAndSubmit('desconocido@example.test')

    await waitFor(() => expect(screen.getByText('Solicitud enviada con éxito')).toBeTruthy())
    expect(screen.getByText(/Si el correo .*se encuentra registrado en MATISTA,/)).toBeTruthy()
    expect(screen.queryByText(/correo no registrado/)).toBeNull()
    expect(screen.queryByText(/correo existente/)).toBeNull()
  })

  it('muestra un aviso técnico cuando el servicio falla y oculta el loading', async () => {
    authApi.forgotPassword.mockRejectedValue(new Error('Servicio no disponible'))
    renderForgot()

    fillAndSubmit()

    await waitFor(() => expect(screen.getByText('No se pudo completar la operación')).toBeTruthy())
    expect(screen.getByText('Servicio no disponible')).toBeTruthy()
    expect(screen.queryByText('Estamos procesando tu solicitud')).toBeNull()
    expect(authApi.forgotPassword).toHaveBeenCalledTimes(1)
  })
})
