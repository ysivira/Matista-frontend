/**
 * Avisos accesibles con tono, título y contenido para los módulos.
 */
/**
 * Selecciona el ícono declarativo del aviso según su tono semántico.
 * @param {{tone: 'success'|'warning'|'error'|'info'}} props Tono del aviso.
 * @returns {import('react').ReactElement} Ícono lineal accesible (decorativo).
 */
function AlertIcon({
  tone
}) {
  if (tone === 'success') {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9.2" />
        <path d="m8.1 12.4 2.6 2.6 5.2-5.4" />
      </svg>;
  }
  if (tone === 'info') {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round">
        <circle cx="12" cy="12" r="9.2" />
        <path d="M12 11v5" />
        <path d="M12 8h.01" />
      </svg>;
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.6 21.4 19.8H2.6L12 3.6Z" />
      <path d="M12 10v4.2" />
      <path d="M12 16.9h.01" />
    </svg>;
}

/**
 * Presenta un aviso accesible para estados públicos de autenticación o consulta compartida.
 * @param {object} props Propiedades del aviso.
 * @param {'success'|'warning'|'error'|'info'} [props.tone] Tono semántico del banner.
 * @param {string} [props.title] Título breve del estado.
 * @param {import('react').ReactNode} [props.children] Contenido extendido del aviso.
 * @returns {import('react').ReactElement} Banner accesible de estado público.
 */
export function AuthAlert({
  tone = 'info',
  title,
  children
}) {
  return <div className={`auth-alert auth-alert--${tone}`} role={tone === 'error' ? 'alert' :
    'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'}>
      <span className="auth-alert__icon" aria-hidden="true">
        <AlertIcon tone={tone} />
      </span>
      <div>
        {title ? <span className="auth-alert__title">{title}</span> : null}
        {children ? <div className="auth-alert__body">{children}</div> : null}
      </div>
    </div>;
}
