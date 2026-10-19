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
  },
  test: {
    clearMocks: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
  },
})
