/**
 * ============================================================
 * MATISTA | CONFIGURACIÓN DE ANÁLISIS ESTÁTICO
 * ============================================================
 *
 * Archivo: eslint.config.js
 * Módulo: Herramientas del frontend
 *
 * Responsabilidad:
 * Componer reglas JavaScript, JSX, hooks y React Refresh y
 * excluir directorios de cobertura y compilación.
 *
 * ============================================================
 */
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['coverage', 'dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
