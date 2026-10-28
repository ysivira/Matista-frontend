/**
 * ============================================================
 * MATISTA | DESARROLLO Y PRUEBAS DEL FRONTEND
 * ============================================================
 *
 * Archivo: vite.config.js
 * Módulo: Herramientas del frontend
 *
 * Responsabilidad:
 * Configurar React, puerto y proxy de desarrollo y preparar
 * Vitest con jsdom y limpieza de mocks entre escenarios.
 *
 * ============================================================
 */
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    // El backend autoriza un unico origen exacto: el servidor de desarrollo no
    // debe derivar a otro puerto (p. ej. 5174) o el navegador pierde CORS y
    // la sesion no puede verificarse. Con strictPort falla de forma explicita
    // si el puerto ya esta ocupado, para liberar la instancia duplicada.
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
    },
  },
  test: {
    clearMocks: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
  },
})
