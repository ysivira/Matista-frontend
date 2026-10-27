import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminInicioPage } from '../src/features/admin/pages/AdminInicioPage.jsx'
import { ComercialDashboard } from '../src/features/asesor/pages/ComercialDashboard.jsx'

/** Renderiza una página de Inicio dentro de un router de memoria. */
function renderInicio(pagina) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      {pagina}
    </MemoryRouter>,
  )
}

describe('Inicio compartido ADMIN/ASESOR (SPEC-26)', () => {
  it('Inicio ADMIN presenta exactamente las cinco áreas con sus rutas reales', () => {
    renderInicio(<AdminInicioPage />)

    const enlaces = screen.getAllByRole('link')
    expect(enlaces).toHaveLength(5)
    expect(enlaces.map(e => e.getAttribute('href'))).toEqual([
      '/admin/empleados', '/admin/planes', '/admin/tarifario', '/admin/versiones', '/admin/configuracion',
    ])
    expect(screen.getByText('Gestión de empleados')).toBeTruthy()
    expect(screen.getByText('Configuración')).toBeTruthy()
  })

  it('Inicio ASESOR presenta exactamente las cinco áreas con sus rutas reales', () => {
    renderInicio(<ComercialDashboard />)

    const enlaces = screen.getAllByRole('link')
    expect(enlaces).toHaveLength(5)
    expect(enlaces.map(e => e.getAttribute('href'))).toEqual([
      '/asesor/nueva', '/asesor/cotizaciones', '/asesor/planes', '/asesor/precios', '/asesor/condiciones',
    ])
    expect(screen.getByText('Nueva cotización')).toBeTruthy()
    expect(screen.getByText('Condiciones comerciales')).toBeTruthy()
  })

  it('los accesos secundarios no son interactivos: los únicos enlaces son las cinco secciones', () => {
    renderInicio(<AdminInicioPage />)

    const enlaces = screen.getAllByRole('link')
    expect(enlaces).toHaveLength(5)
    // El punto descriptivo vive como texto dentro de la sección; no es un
    // enlace aparte y no agrega rutas nuevas.
    const punto = screen.getByText('Directorio de cuentas')
    expect(punto.closest('li')).toBeTruthy()
    expect(punto.closest('a')).toBe(enlaces[0])
  })

  it('cada sección comparte la misma clase de estructura oscura sin tarjetas blancas', () => {
    renderInicio(<AdminInicioPage />)

    const secciones = screen.getAllByRole('link')
    for (const seccion of secciones) {
      expect(seccion.className).toBe('inicio-modulo__seccion')
    }
    expect(document.querySelector('.inicio-modulo__tarjeta')).toBeNull()
  })
})
