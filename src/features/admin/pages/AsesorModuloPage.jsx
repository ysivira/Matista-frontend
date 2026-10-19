import { AdminLayout } from '../components/AdminLayout.jsx'

/**
 * Marcador del módulo ASESOR (SPEC-03 SL-2 pendiente de autorización).
 * No consume servicios de cotizaciones: solo hace visible el destino en la
 * barra lateral y prepara el shell definitivo del módulo.
 * @returns {import('react').ReactElement} Vista provisional dentro del shell ADMIN.
 */
export function AsesorModuloPage() {
  return (
    <AdminLayout section="Módulo ASESOR">
      <div className="admin-profile">
        <h1 className="admin-title">Cotizaciones del asesor</h1>
        <p className="admin-profile__lead">
          Módulo pendiente: será implementado en el slice SL-2 de SPEC-03 con las
          pantallas de agenda y cotizaciones provistas por el diseño de referencia.
        </p>
      </div>
    </AdminLayout>
  )
}
