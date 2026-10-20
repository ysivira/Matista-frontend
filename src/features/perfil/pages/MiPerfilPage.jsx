import { AdminLayout } from '../../admin/components/AdminLayout.jsx'
import { AuthAlert } from '../../auth/components/AuthAlert.jsx'
import { PasswordField, TextField } from '../../auth/components/AuthFields.jsx'
import { useSession } from '../../auth/hooks/useSession.js'
import { usePerfilAcciones } from '../hooks/usePerfilAcciones.js'

/**
 * Mi perfil compartido por ADMIN y ASESOR (ruta /perfil): muestra los datos
 * de la sesión real y expone las operaciones personales de AUTH (cambio de
 * contraseña y solicitud de cambio de correo) reutilizando las mismas
 * validaciones del modal de cuenta. La validación final siempre es del servidor.
 * @returns {import('react').ReactElement} Perfil propio de la cuenta operante.
 */
export function MiPerfilPage() {
  const { user } = useSession()
  const perfil = usePerfilAcciones()

  const nombreCompleto = [user?.nombre, user?.apellido].filter(Boolean).join(' ') || '—'

  return (
    <AdminLayout section="Mi perfil">
      <div className="admin-profile">
        {/* El título vive solo en el encabezado superior del shell (h1); la
            vista mantiene su descripción breve sin repetir «Mi perfil». */}
        <p className="admin-directory__lead">Se ven tus datos reales; la autorización y el estado los decide el servidor.</p>

        <dl className="admin-facts admin-profile__identity">
          <div><dt>Nombre</dt><dd>{nombreCompleto}</dd></div>
          <div><dt>Correo</dt><dd>{user?.email ?? '—'}</dd></div>
          <div><dt>Legajo</dt><dd>{user?.legajo ?? '—'}</dd></div>
          <div><dt>Rol</dt><dd>{user?.rol}</dd></div>
        </dl>

        {perfil.passwordChanged ? (
          <AuthAlert tone="success" title="Contraseña actualizada">
            <p>Tu contraseña se actualizó y todas las sesiones quedaron cerradas.</p>
            <p>Vuelve a iniciar sesión desde la barra lateral después de cerrar el módulo.</p>
          </AuthAlert>
        ) : (
          <section className="admin-profile__section" aria-label="Cambio de contraseña">
            <h2>Cambio de contraseña</h2>
            <form className="auth-form" noValidate onSubmit={(event) => void perfil.handlePasswordSubmit(event)}>
              <PasswordField
                id="perfil-current-password"
                label="Contraseña actual"
                required
                autoComplete="current-password"
                value={perfil.passwordValues.current}
                onValueChange={(value) => perfil.setPasswordValues((actual) => ({ ...actual, current: value }))}
                error={perfil.fieldErrors.current}
              />
              <PasswordField
                id="perfil-new-password"
                label="Nueva contraseña"
                required
                autoComplete="new-password"
                hint="La política vigente de contraseñas la aplica el servidor."
                value={perfil.passwordValues.next}
                onValueChange={(value) => perfil.setPasswordValues((actual) => ({ ...actual, next: value }))}
                error={perfil.fieldErrors.next}
              />
              <PasswordField
                id="perfil-confirm-password"
                label="Confirmar nueva contraseña"
                required
                autoComplete="new-password"
                value={perfil.passwordValues.confirmation}
                onValueChange={(value) => perfil.setPasswordValues((actual) => ({ ...actual, confirmation: value }))}
                error={perfil.fieldErrors.confirmation}
              />
              {perfil.passwordNotice ? (
                <AuthAlert tone={perfil.passwordNotice.tone} title={perfil.passwordNotice.title}>{perfil.passwordNotice.message}</AuthAlert>
              ) : null}
              <button className="admin-button admin-button--compact" type="submit" disabled={perfil.submitting}>
                {perfil.submitting ? 'Procesando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </section>
        )}

        <section className="admin-profile__section" aria-label="Cambio de correo">
          <h2>Solicitud de cambio de correo</h2>
          <form className="auth-form" noValidate onSubmit={(event) => void perfil.handleEmailSubmit(event)}>
            <TextField
              id="perfil-new-email"
              type="email"
              label="Correo nuevo"
              required
              autoComplete="email"
              placeholder="nuevo@email.com"
              value={perfil.emailValues.email}
              onValueChange={(value) => perfil.setEmailValues((actual) => ({ ...actual, email: value }))}
              error={perfil.fieldErrors.email}
            />
            <PasswordField
              id="perfil-email-password"
              label="Contraseña actual"
              required
              autoComplete="current-password"
              value={perfil.emailValues.currentPassword}
              onValueChange={(value) => perfil.setEmailValues((actual) => ({ ...actual, currentPassword: value }))}
              error={perfil.fieldErrors.currentPassword}
            />
            {perfil.emailNotice ? (
              <AuthAlert tone={perfil.emailNotice.tone} title={perfil.emailNotice.title}>{perfil.emailNotice.message}</AuthAlert>
            ) : null}
            <button className="admin-button admin-button--compact" type="submit" disabled={perfil.submitting}>
              {perfil.submitting ? 'Procesando...' : 'Solicitar cambio de correo'}
            </button>
          </form>
        </section>
      </div>
    </AdminLayout>
  )
}
