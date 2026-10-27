import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppLayout } from '../src/shared/layouts/AppLayout.jsx'
import { ConsultaPlanes } from '../src/shared/catalogo/ConsultaPlanes.jsx'

/**
 * matchMedia sintético para jsdom: responde por prefijo a cada consulta de
 * breakpoint usada por el layout y el catálogo (SPEC-27).
 */
function simularMatchMedia(angosta) {
  const original = window.matchMedia
  window.matchMedia = vi.fn().mockImplementation(consulta => {
    const coincide = consulta.includes('max-width') === angosta
    return {
      matches: coincide,
      media: consulta,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }
  })
  return () => { window.matchMedia = original }
}

const USUARIO = { legajo: '0000000001', nombre: 'David', apellido: 'Diaz', rol: 'ASESOR' }

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/asesor']}>
      <AppLayout user={USUARIO} onLogout={() => {}} onOpenProfile={() => {}}>
        <p>Contenido</p>
      </AppLayout>
    </MemoryRouter>,
  )
}

/** API sintética del catálogo con un plan listo para expandir. */
function apiCatalogo() {
  return {
    listarPlanes: vi.fn().mockResolvedValue({
      planes: [{
        id: 7, nombre: 'Plan Matista 300', detalles: 'Consultas|100%|—',
        condiciones_generales: 'Condiciones generales del plan.',
      }],
    }),
  }
}

describe('navegación responsive compartida (SPEC-27)', () => {
  afterEach(cleanup)

  it('en escritorio no presenta botón hamburguesa ni velo', () => {
    const restaurar = simularMatchMedia(false)
    renderLayout()
    expect(screen.queryByRole('button', { name: 'Abrir menú de navegación' })).toBeNull()
    expect(document.querySelector('.admin-velo')).toBeNull()
    restaurar()
  })

  it('en pantallas angostas el drawer abre por hamburguesa y cierra por Escape', () => {
    const restaurar = simularMatchMedia(true)
    renderLayout()

    const hamburguesa = screen.getByRole('button', { name: 'Abrir menú de navegación' })
    expect(hamburguesa.getAttribute('aria-expanded')).toBe('false')
    expect(document.querySelector('.admin-sidebar').className).not.toContain('--abierto')

    fireEvent.click(hamburguesa)
    expect(document.querySelector('.admin-sidebar').className).toContain('--abierto')
    expect(hamburguesa.getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelector('.admin-velo')).toBeTruthy()
    // El documento no se desplaza mientras el drawer está abierto.
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.querySelector('.admin-sidebar').className).not.toContain('--abierto')
    expect(document.querySelector('.admin-velo')).toBeNull()
    expect(document.body.style.overflow).not.toBe('hidden')
    restaurar()
  })

  it('cierra al tocar el velo y al seleccionar una opción de navegación', () => {
    const restaurar = simularMatchMedia(true)
    renderLayout()

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }))
    fireEvent.click(document.querySelector('.admin-velo'))
    expect(document.querySelector('.admin-velo')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }))
    fireEvent.click(screen.getAllByRole('link')[0])
    expect(document.querySelector('.admin-sidebar').className).not.toContain('--abierto')
    restaurar()
  })
})

describe('catálogo de planes responsive (SPEC-27)', () => {
  afterEach(cleanup)

  it('en móvil la ficha del plan abierto vive junto a su tarjeta y el resto queda oculto', async () => {
    const restaurar = simularMatchMedia(true)
    render(
      <MemoryRouter>
        <ConsultaPlanes api={apiCatalogo()} etiqueta="Catálogo" rutaTarifario="/asesor/precios" />
      </MemoryRouter>,
    )
    const boton = await screen.findByRole('button', { name: 'Ver detalles' })
    fireEvent.click(boton)

    const ficha = document.getElementById('plan-7-detalles')
    expect(ficha).toBeTruthy()
    // La ficha es hijo directo de la tarjeta seleccionada (acordeón contextual).
    expect(ficha.closest('article')).toBeTruthy()
    expect(document.querySelector('.admin-plan-fichas')).toBeNull()
    expect(screen.getByRole('button', { name: 'Ocultar detalles' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar detalles' }))
    expect(document.getElementById('plan-7-detalles')).toBeNull()
    restaurar()
  })

  it('en escritorio conserva el panel de fichas debajo de la rejilla', async () => {
    const restaurar = simularMatchMedia(false)
    render(
      <MemoryRouter>
        <ConsultaPlanes api={apiCatalogo()} etiqueta="Catálogo" rutaTarifario="/asesor/precios" />
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalles' }))

    const ficha = document.getElementById('plan-7-detalles')
    expect(ficha).toBeTruthy()
    expect(ficha.closest('article')).toBeNull()
    expect(document.querySelector('.admin-plan-fichas')).toBeTruthy()
    restaurar()
  })
})
