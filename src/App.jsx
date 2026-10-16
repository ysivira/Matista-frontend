import { RouterProvider } from 'react-router-dom'
import './App.css'
import { createBrowserAppRouter } from './app/router.jsx'

const router = createBrowserAppRouter()

/**
 * Monta el router principal sobre los proveedores globales configurados en main.jsx.
 * @returns {import('react').ReactElement} Aplicación enrutada de MATISTA.
 */
function App() {
  return <RouterProvider router={router} />
}

export default App
