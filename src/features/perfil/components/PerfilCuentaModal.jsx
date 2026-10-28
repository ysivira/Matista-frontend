/**
 * ============================================================
 * MATISTA | MODAL DE CUENTA PERSONAL
 * ============================================================
 *
 * Archivo: PerfilCuentaModal.jsx
 * Módulo: Perfil
 *
 * Responsabilidad:
 * Presentar identidad y alternar formularios de contraseña o correo de la cuenta operante.
 *
 * CONTENIDO:
 * - Función PerfilCuentaModal.
 *
 * DEPENDENCIAS:
 * - react
 * - ../../../shared/ui/Modal.jsx
 * - ../../../shared/lib/iniciales.js
 * - ../../auth/components/AuthAlert.jsx
 * - ../../auth/components/AuthFields.jsx
 * - ../../auth/hooks/useSession.js
 * - ../hooks/usePerfilAcciones.js
 *
 * ============================================================
 */
import { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal.jsx';
import { inicialesDe } from '../../../shared/lib/iniciales.js';
import { AuthAlert } from '../../auth/components/AuthAlert.jsx';
import { PasswordField, TextField } from '../../auth/components/AuthFields.jsx';
import { useSession } from '../../auth/hooks/useSession.js';
import { usePerfilAcciones } from '../hooks/usePerfilAcciones.js';
import './perfilCuentaModal.css';

/**
 * Modal compacto de la cuenta operante bajo el diseño Amethyst Prism
 * Enterprise: se abre desde la tarjeta de usuario de la barra lateral.
 * Presenta una vista inicial con los datos reales de la sesión y dos
 * opciones («Cambiar contraseña» y «Cambiar correo»); al elegir una se
 * muestra exclusivamente su formulario con regreso a la vista inicial.
 * Reutiliza las validaciones y el DTO de AUTH (usePerfilAcciones) sin
 * alterar contratos; el servidor sigue siendo la última autoridad.
 * @param {{onClose: () => void}} props Cierre del modal.
 * @returns {import('react').ReactElement} Modal de cuenta con navegación interna.
 */
export function PerfilCuentaModal({
  onClose
}) {
  const {
    user
  } = useSession();
  const perfil = usePerfilAcciones();
  const [vista, setVista] = useState('inicio'); // 'inicio' | 'password' | 'email'

  const nombreCompleto = [user?.nombre, user?.apellido].filter(Boolean).join(' ') || '—';

  /**
   * Regresa a la vista inicial conservando el aviso mientras se muestra.
   * @returns {void}
   */
  function volver() {
    setVista('inicio');
  }

  // La identidad vive en la cabecera del modal; la vista inicial solo agrega
  // los datos restantes y las opciones de cuenta.
  const datosIniciales = <>
      <dl className="admin-facts admin-facts--compact">
        <div>
          <dt>Correo</dt>
          <dd>{user?.email ?? '—'}</dd>
        </div>
        <div>
          <dt>Legajo</dt>
          <dd>{user?.legajo ?? '—'}</dd>
        </div>
        <div>
          <dt>Rol</dt>
          <dd>{user?.rol ?? '—'}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{user?.estado ?? '—'}</dd>
        </div>
      </dl>
      <div className="admin-options">
        <button className="admin-options__item" type="button" onClick={() => setVista('password')}>
          <span aria-hidden="true">🔑</span>
          Cambiar contraseña
          <span className="admin-options__chev" aria-hidden="true">›</span>
        </button>
        <button className="admin-options__item" type="button" onClick={() => setVista('email')}>
          <span aria-hidden="true">✉️</span>
          Cambiar correo
          <span className="admin-options__chev" aria-hidden="true">›</span>
        </button>
      </div>
    </>;
  const formularioPassword = <form className="auth-form" noValidate
    onSubmit={event => void perfil.handlePasswordSubmit(event)}>
      <h3 className="admin-modal__section-title">Cambiar contraseña</h3>
      {perfil.passwordChanged ? <AuthAlert tone="success" title="Contraseña actualizada">
          <p>Tu contraseña se actualizó y todas las sesiones quedaron cerradas.</p>
          <p>Vuelve a iniciar sesión desde «Cerrar sesión» de la barra lateral.</p>
        </AuthAlert> : <>
          <PasswordField id="perfil-modal-current-password" label="Contraseña actual" required
            autoComplete="current-password" value={perfil.passwordValues.current}
            onValueChange={value => perfil.setPasswordValues(actual => ({
        ...actual,
        current: value
      }))} error={perfil.fieldErrors.current} />
          <PasswordField id="perfil-modal-new-password" label="Nueva contraseña" required
            autoComplete="new-password" hint="La política vigente de contraseñas la aplica el servidor."
            value={perfil.passwordValues.next} onValueChange={value => perfil.setPasswordValues(actual => ({
        ...actual,
        next: value
      }))} error={perfil.fieldErrors.next} />
          <PasswordField id="perfil-modal-confirm-password" label="Confirmar nueva contraseña"
            required autoComplete="new-password" value={perfil.passwordValues.confirmation}
            onValueChange={value => perfil.setPasswordValues(actual => ({
        ...actual,
        confirmation: value
      }))} error={perfil.fieldErrors.confirmation} />
          {perfil.passwordNotice ? <AuthAlert tone={perfil.passwordNotice.tone}
            title={perfil.passwordNotice.title}>{perfil.passwordNotice.message}</AuthAlert> : null}
        </>}
      <div className="admin-form-row">
        <button className="admin-button admin-button--ghost" type="button" onClick={volver}>
          Volver
        </button>
        <button className="admin-button admin-button--compact" type="submit"
          disabled={perfil.submitting}>
          {perfil.submitting ? 'Procesando...' : 'Cambiar contraseña'}
        </button>
      </div>
    </form>;
  const formularioEmail = <form className="auth-form" noValidate
    onSubmit={event => void perfil.handleEmailSubmit(event)}>
      <h3 className="admin-modal__section-title">Cambiar correo</h3>
      <TextField id="perfil-modal-new-email" type="email" label="Correo nuevo" required
        autoComplete="email" placeholder="nuevo@email.com" value={perfil.emailValues.email}
        onValueChange={value => perfil.setEmailValues(actual => ({
      ...actual,
      email: value
    }))} error={perfil.fieldErrors.email} />
      <PasswordField id="perfil-modal-email-password" label="Contraseña actual" required
        autoComplete="current-password" value={perfil.emailValues.currentPassword}
        onValueChange={value => perfil.setEmailValues(actual => ({
      ...actual,
      currentPassword: value
    }))} error={perfil.fieldErrors.currentPassword} />
      {perfil.emailNotice ? <AuthAlert tone={perfil.emailNotice.tone}
        title={perfil.emailNotice.title}>{perfil.emailNotice.message}</AuthAlert> : null}
      <div className="admin-form-row">
        <button className="admin-button admin-button--ghost" type="button" onClick={volver}>
          Volver
        </button>
        <button className="admin-button admin-button--compact" type="submit"
          disabled={perfil.submitting}>
          {perfil.submitting ? 'Procesando...' : 'Solicitar cambio de correo'}
        </button>
      </div>
    </form>;
  return <Modal label="Mi perfil" title="Mi perfil" subtitle={nombreCompleto} tone="primary"
    className={vista === 'inicio' ? '' : 'perfil-cuenta-modal'}
    icon={<span className="admin-avatar admin-avatar--small"
    aria-hidden="true">{inicialesDe(user).slice(0, 2).toUpperCase() || '—'}</span>} onClose={onClose}>
      {vista === 'inicio' ? datosIniciales : null}
      {vista === 'password' ? formularioPassword : null}
      {vista === 'email' ? formularioEmail : null}
    </Modal>;
}
