/**
 * ============================================================
 * MATISTA | PÁGINAS PROVISIONALES
 * ============================================================
 *
 * Archivo: PlaceholderPages.jsx
 * Módulo: Composición de la aplicación
 *
 * Responsabilidad:
 * Presentar tarjetas y enlaces de infraestructura para rutas provisionales.
 *
 * CONTENIDO:
 * - Función RoutePlaceholder.
 * - Función InfrastructurePage.
 *
 * DEPENDENCIAS:
 * - react-router-dom
 * - ../shared/ui/BrandLogo.jsx
 *
 * ============================================================
 */
import { Link } from 'react-router-dom';
import { BrandLogo } from '../shared/ui/BrandLogo.jsx';

/**
 * Presenta una tarjeta provisional para validar rutas sin anticipar las pantallas de D.3.
 * @param {object} props Textos descriptivos de la ruta provisional.
 * @returns {import('react').ReactElement} Placeholder accesible de infraestructura.
 */
export function RoutePlaceholder({
  eyebrow,
  title,
  description
}) {
  return <main className="infrastructure-shell">
      <div className="infrastructure-content">
        <BrandLogo surface="dark" compact />
        <section className="infrastructure-card">
          <span className="infrastructure-card__eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <nav className="infrastructure-links" aria-label="Navegación provisional">
            <Link className="infrastructure-link" to="/">Volver al inicio</Link>
          </nav>
        </section>
      </div>
    </main>;
}

/**
 * Expone el estado de D.2 y enlaces mínimos para validar el router.
 * @returns {import('react').ReactElement} Página provisional pública.
 */
export function InfrastructurePage() {
  return <main className="infrastructure-shell">
      <div className="infrastructure-content">
        <BrandLogo surface="dark" />
        <section className="infrastructure-card">
          <span className="infrastructure-card__eyebrow">SPEC-02 · Etapa D.2</span>
          <h1>Infraestructura frontend AUTH</h1>
          <p>Router, cliente HTTP, sesión y protección de rutas preparados para las pantallas de D.3.</p>
          <nav className="infrastructure-links" aria-label="Rutas de infraestructura">
            <Link className="infrastructure-link" to="/login">Ruta pública</Link>
            <Link className="infrastructure-link" to="/asesor">Ruta protegida</Link>
          </nav>
        </section>
      </div>
    </main>;
}
