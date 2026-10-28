/**
 * ============================================================
 * MATISTA | CONTENEDOR PÚBLICO AUTH
 * ============================================================
 *
 * Archivo: AuthLayout.jsx
 * Módulo: Autenticación
 *
 * Responsabilidad:
 * Componer logotipo y tarjeta de contenido para las pantallas públicas de cuenta.
 *
 * CONTENIDO:
 * - Función AuthLayout.
 *
 * DEPENDENCIAS:
 * - ../../../shared/ui/BrandLogo.jsx
 * - ./auth.css
 *
 * ============================================================
 */
import { BrandLogo } from '../../../shared/ui/BrandLogo.jsx';
import './auth.css';

/**
 * Estructura pública de autenticación según Amethyst Prism: logotipo sobre el entramado
 * oscuro (protocolo de marca) y tarjeta clara única, sin superficies contrastadas mezcladas.
 * @param {object} props Propiedades del contenedor.
 * @param {import('react').ReactNode} props.children Contenido de la tarjeta.
 * @param {boolean} [props.wide] Amplía la tarjeta para formularios largos como el registro.
 * @returns {import('react').ReactElement} Contenedor público de pantallas AUTH.
 */
export function AuthLayout({
  children,
  wide = false
}) {
  return <main className={`auth-shell${wide ? ' auth-shell--wide' : ''}`}>
      <div className="auth-content">
        <BrandLogo surface="dark" compact />
        <section className="auth-card">{children}</section>
      </div>
    </main>;
}
