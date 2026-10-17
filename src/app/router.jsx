import { createBrowserRouter, createMemoryRouter, Navigate } from 'react-router-dom'
import { AUTH_ROLES } from '../features/auth/auth.constants.js'
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute.jsx'
import {
  RoleLandingPage,
  RoutePlaceholder,
} from './PlaceholderPages.jsx'
import { LoginPage } from '../features/auth/pages/LoginPage.jsx'
import { RegisterPage } from '../features/auth/pages/RegisterPage.jsx'
import { VerifyEmailPage } from '../features/auth/pages/VerifyEmailPage.jsx'
import { ResendVerificationPage } from '../features/auth/pages/ResendVerificationPage.jsx'
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage.jsx'
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage.jsx'

const routes = [
  {
    // Punto de entrada: la unidad de decisión es /login, donde LoginPage ya resuelve
    // carga (checking), error técnico con reintento y el destino por rol si hay sesión.
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/confirm-email',
    element: <VerifyEmailPage />,
  },
  {
    path: '/resend-verification',
    element: <ResendVerificationPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/account-unavailable',
    element: (
      <RoutePlaceholder
        eyebrow="Estado de cuenta"
        title="Cuenta no disponible"
        description="El backend conserva la autoridad sobre el estado de la cuenta."
      />
    ),
  },
  {
    path: '/access-denied',
    element: (
      <RoutePlaceholder
        eyebrow="Autorización"
        title="Acceso no autorizado"
        description="La ruta solicitada no corresponde al rol de la sesión."
      />
    ),
  },
  {
    element: <ProtectedRoute allowedRoles={[AUTH_ROLES.ADMIN]} />,
    children: [
      { path: '/admin', element: <RoleLandingPage role={AUTH_ROLES.ADMIN} /> },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={[AUTH_ROLES.ASESOR]} />,
    children: [
      { path: '/asesor', element: <RoleLandingPage role={AUTH_ROLES.ASESOR} /> },
    ],
  },
  {
    path: '*',
    element: (
      <RoutePlaceholder
        eyebrow="Navegación"
        title="Ruta no encontrada"
        description="La dirección solicitada no existe en MATISTA."
      />
    ),
  },
]

/**
 * Crea el router de navegador utilizado por la aplicación en ejecución.
 * @returns {import('react-router-dom').DataRouter} Router principal.
 */
export function createBrowserAppRouter() {
  return createBrowserRouter(routes)
}

/**
 * Crea el mismo árbol de rutas en memoria para pruebas aisladas sin servidor.
 * @param {string[]} [initialEntries] Historial inicial que debe resolver el router.
 * @returns {import('react-router-dom').DataRouter} Router de prueba.
 */
export function createMemoryAppRouter(initialEntries = ['/']) {
  return createMemoryRouter(routes, { initialEntries })
}
