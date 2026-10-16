import { describe, expect, it, vi } from 'vitest'
import { createAuthApi } from '../src/features/auth/api/authApi.js'

describe('authApi', () => {
  it('mapea las doce operaciones al contrato vigente', async () => {
    const client = { request: vi.fn().mockResolvedValue(null) }
    const api = createAuthApi(client)
    const signal = new AbortController().signal

    await api.register({ legajo: '12345678' })
    await api.verifyEmail('verification-token')
    await api.resendVerification('asesor@example.test')
    await api.login({ email: 'asesor@example.test', password: 'secreto' })
    await api.logout()
    await api.forgotPassword('asesor@example.test')
    await api.resetPassword({ token: 'reset-token', newPassword: 'nueva' })
    await api.getMe({ signal })
    await api.updateMe({ telefono: null })
    await api.changePassword({ currentPassword: 'actual', newPassword: 'nueva' })
    await api.changeEmail({ email: 'nuevo@example.test', currentPassword: 'actual' })
    await api.confirmEmailChange('email-change-token')

    expect(client.request.mock.calls).toEqual([
      ['/api/auth/register', { method: 'POST', body: { legajo: '12345678' } }],
      ['/api/auth/verify-email', { method: 'POST', body: { token: 'verification-token' } }],
      ['/api/auth/resend-verification', { method: 'POST', body: { email: 'asesor@example.test' } }],
      ['/api/auth/login', { method: 'POST', body: { email: 'asesor@example.test', password: 'secreto' } }],
      ['/api/auth/logout', { method: 'POST' }],
      ['/api/auth/forgot-password', { method: 'POST', body: { email: 'asesor@example.test' } }],
      ['/api/auth/reset-password', { method: 'POST', body: { token: 'reset-token', newPassword: 'nueva' } }],
      ['/api/auth/me', { signal }],
      ['/api/auth/me', { method: 'PATCH', body: { telefono: null } }],
      ['/api/auth/change-password', { method: 'POST', body: { currentPassword: 'actual', newPassword: 'nueva' } }],
      ['/api/auth/change-email', { method: 'POST', body: { email: 'nuevo@example.test', currentPassword: 'actual' } }],
      ['/api/auth/confirm-email-change', { method: 'POST', body: { token: 'email-change-token' } }],
    ])
  })
})
