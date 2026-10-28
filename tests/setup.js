/**
 * ============================================================
 * MATISTA | LIMPIEZA GLOBAL DE PRUEBAS REACT
 * ============================================================
 *
 * Archivo: setup.js
 * Módulo: Soporte de pruebas
 *
 * Responsabilidad:
 * Registrar la limpieza del árbol renderizado después de cada
 * prueba para evitar contaminación entre escenarios.
 *
 * ============================================================
 */
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)
