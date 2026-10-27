/**
 * MATISTA - Frontend · Aplicación
 * Archivo: App.jsx
 *
 * RESPONSABILIDAD:
 * Compone la aplicación: proveedores, enrutado y disposición general de la sesión.
 *
 * CONTENIDO:
 * - Valor por defecto (Identifier).
 *
 * DEPENDENCIAS:
 * - react-router-dom
 * - ./App.css
 * - ./app/router.jsx
 */
import { RouterProvider } from 'react-router-dom';
import './App.css';
import { createBrowserAppRouter } from './app/router.jsx';
const router = createBrowserAppRouter();

/**
 * Monta el router principal sobre los proveedores globales configurados en main.jsx.
 * @returns {import('react').ReactElement} Aplicación enrutada de MATISTA.
 */
function App() {
  return <RouterProvider router={router} />;
}
export default App;
