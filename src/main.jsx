/**
 * ============================================================
 * MATISTA | ENTRADA DEL FRONTEND
 * ============================================================
 *
 * Archivo: main.jsx
 * Módulo: Composición de la aplicación
 *
 * Responsabilidad:
 * Montar React en el nodo raíz con StrictMode, estilos globales
 * y proveedores de aplicación.
 *
 * ============================================================
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppProviders } from './app/AppProviders.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
