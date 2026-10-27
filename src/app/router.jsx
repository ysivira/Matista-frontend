/**
 * Rutas públicas y protegidas de MATISTA, con composición por rol y sesión.
 */
import { createBrowserRouter, createMemoryRouter, Navigate } from 'react-router-dom';
import { AUTH_ROLES } from '../features/auth/auth.constants.js';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute.jsx';
import { RoutePlaceholder } from './PlaceholderPages.jsx';
import { LoginPage } from '../features/auth/pages/LoginPage.jsx';
import { RegisterPage } from '../features/auth/pages/RegisterPage.jsx';
import { VerifyEmailPage } from '../features/auth/pages/VerifyEmailPage.jsx';
import { ConfirmEmailChangePage } from '../features/auth/pages/ConfirmEmailChangePage.jsx';
import { ResendVerificationPage } from '../features/auth/pages/ResendVerificationPage.jsx';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage.jsx';
import { SessionLayout } from './SessionLayout.jsx';
import { AdminInicioPage } from '../features/admin/pages/AdminInicioPage.jsx';
import { EmployeesPage } from '../features/admin/pages/EmployeesPage.jsx';
import { PlanesPage } from '../features/admin/pages/PlanesPage.jsx';
import { TarifarioPage } from '../features/admin/pages/TarifarioPage.jsx';
import { VersionesPage } from '../features/admin/pages/VersionesPage.jsx';
import { ConfiguracionComercialPage } from '../features/admin/pages/ConfiguracionComercialPage.jsx';
import { MiPerfilPage } from '../features/perfil/pages/MiPerfilPage.jsx';
import { ComercialDashboard } from '../features/asesor/pages/ComercialDashboard.jsx';
import { ListasPage } from '../features/asesor/pages/ListasPage.jsx';
import { QuoteForm } from '../features/asesor/pages/QuoteForm.jsx';
import { QuoteHistory } from '../features/asesor/pages/QuoteHistory.jsx';
import { QuoteDetail } from '../features/asesor/pages/QuoteDetail.jsx';
import { CondicionesPage } from '../features/asesor/pages/CondicionesPage.jsx';
import { PlanesAsesorPage } from '../features/asesor/pages/PlanesPage.jsx';
const routes = [{
  // Punto de entrada: la unidad de decisión es /login, donde LoginPage ya resuelve
  // carga (checking), error técnico con reintento y el destino por rol si hay sesión.
  path: '/',
  element: <Navigate to="/login" replace />
}, {
  path: '/login',
  element: <LoginPage />
}, {
  path: '/register',
  element: <RegisterPage />
}, {
  path: '/confirm-email',
  element: <VerifyEmailPage />
}, {
  path: '/confirm-email-change',
  element: <ConfirmEmailChangePage />
}, {
  path: '/resend-verification',
  element: <ResendVerificationPage />
}, {
  path: '/forgot-password',
  element: <ForgotPasswordPage />
}, {
  path: '/reset-password',
  element: <ResetPasswordPage />
}, {
  path: '/account-unavailable',
  element: <RoutePlaceholder eyebrow="Estado de cuenta" title="Cuenta no disponible"
    description="El backend conserva la autoridad sobre el estado de la cuenta." />
}, {
  path: '/access-denied',
  element: <RoutePlaceholder eyebrow="Autorización" title="Acceso no autorizado"
    description="La ruta solicitada no corresponde al rol de la sesión." />
}, {
  // Módulo ADMIN: shell compartido con el directorio SL-1 y las pantallas
  // de consulta SL-2; el guard del bloque exige rol ADMIN para todas.
  element: <ProtectedRoute allowedRoles={[AUTH_ROLES.ADMIN]} />,
  children: [{
    path: '/admin',
    element: <SessionLayout section="Módulo ADMIN" />,
    children: [{
      index: true,
      element: <AdminInicioPage />
    }, {
      path: 'empleados',
      element: <EmployeesPage />
    }, {
      path: 'planes',
      element: <PlanesPage />
    }, {
      path: 'tarifario',
      element: <TarifarioPage />
    }, {
      path: 'versiones',
      element: <VersionesPage />
    }, {
      path: 'configuracion',
      element: <ConfiguracionComercialPage />
    }]
  }]
}, {
  // ASESOR reutiliza el shell neutral y el catálogo exclusivamente de consulta.
  element: <ProtectedRoute allowedRoles={[AUTH_ROLES.ASESOR]} />,
  children: [{
    path: '/asesor',
    element: <SessionLayout section="Gestión comercial" />,
    children: [{
      index: true,
      element: <ComercialDashboard />
    }, {
      path: 'planes',
      element: <PlanesAsesorPage />
    }, {
      path: 'precios',
      element: <ListasPage />
    }, {
      path: 'condiciones',
      element: <CondicionesPage />
    }, {
      path: 'nueva',
      element: <QuoteForm />
    }, {
      path: 'cotizaciones',
      element: <QuoteHistory />
    }, {
      path: 'cotizaciones/:id',
      element: <QuoteDetail />
    }, {
      path: 'cotizaciones/:id/preparacion',
      element: <QuoteForm />
    }, {
      path: 'cotizaciones/:id/recotizar',
      element: <QuoteForm recotizar />
    }]
  }]
}, {
  // Perfil propio compartido por ambos roles con la misma sesión AUTH.
  element: <ProtectedRoute allowedRoles={[AUTH_ROLES.ADMIN, AUTH_ROLES.ASESOR]} />,
  children: [{
    path: '/perfil',
    element: <SessionLayout section="Mi perfil"><MiPerfilPage /></SessionLayout>
  }]
}, {
  path: '*',
  element: <RoutePlaceholder eyebrow="Navegación" title="Ruta no encontrada"
    description="La dirección solicitada no existe en MATISTA." />
}];

/**
 * Crea el router de navegador utilizado por la aplicación en ejecución.
 * @returns {import('react-router-dom').DataRouter} Router principal.
 */
export function createBrowserAppRouter() {
  return createBrowserRouter(routes);
}

/**
 * Crea el mismo árbol de rutas en memoria para pruebas aisladas sin servidor.
 * @param {string[]} [initialEntries] Historial inicial que debe resolver el router.
 * @returns {import('react-router-dom').DataRouter} Router de prueba.
 */
export function createMemoryAppRouter(initialEntries = ['/']) {
  return createMemoryRouter(routes, {
    initialEntries
  });
}
