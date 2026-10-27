import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom'
import { useState } from 'react'
import { AppLayout } from '../src/shared/layouts/AppLayout.jsx'
import { DiscountSelector } from '../src/features/asesor/components/DiscountSelector.jsx'
import { ConsultaPlanes } from '../src/shared/catalogo/ConsultaPlanes.jsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function viewportMovil(movil = true) {
  vi.stubGlobal('matchMedia', vi.fn(consulta => ({
    matches: movil, media: consulta,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })))
}

function montarLayout(rol, onOpenProfile = vi.fn()) {
  const base = `/${rol.toLowerCase()}`
  const router = createMemoryRouter([{
    path: '/',
    element: <AppLayout user={{ nombre: 'Prueba', rol }} onLogout={vi.fn()} onOpenProfile={onOpenProfile} />,
    children: [{ path: '*', element: <p>Contenido de destino</p> }],
  }], { initialEntries: [base] })
  render(<RouterProvider router={router} />)
  return { router, base }
}

describe.each(['ADMIN', 'ASESOR'])('SPEC-29 drawer compartido %s', rol => {
  it('cierra al abrir Perfil sin depender de una transición de ruta', () => {
    viewportMovil()
    const abrirPerfil = vi.fn()
    montarLayout(rol, abrirPerfil)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }))
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.click(screen.getByRole('button', { name: 'Mi perfil' }))
    expect(abrirPerfil).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.admin-velo')).toBeNull()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('cierra ante navegación externa, query, Atrás y Adelante sin reabrirse al volver', async () => {
    viewportMovil()
    const { router, base } = montarLayout(rol)
    const abrir = () => fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }))
    const cerrado = () => expect(document.querySelector('.admin-velo')).toBeNull()
    abrir()
    await act(() => router.navigate(`${base}/planes`))
    cerrado()
    abrir()
    await act(() => router.navigate(`${base}/planes?consulta=1`))
    cerrado()
    abrir()
    await act(() => router.navigate(-1))
    cerrado()
    abrir()
    await act(() => router.navigate(1))
    cerrado()
    await act(() => router.navigate(base))
    cerrado()
  })

  it.each(['X', 'Escape', 'overlay'])('conserva el cierre por %s y devuelve el foco a la hamburguesa', cierre => {
    viewportMovil()
    montarLayout(rol)
    const boton = screen.getByRole('button', { name: 'Abrir menú de navegación' })
    fireEvent.click(boton)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar menú' }))
    if (cierre === 'X') fireEvent.click(screen.getByRole('button', { name: 'Cerrar menú' }))
    else if (cierre === 'Escape') fireEvent.keyDown(document, { key: 'Escape' })
    else fireEvent.click(document.querySelector('.admin-velo'))
    expect(boton.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(boton)
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('cierra al seleccionar un enlace lateral', () => {
    viewportMovil()
    montarLayout(rol)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }))
    fireEvent.click(screen.getByRole('link', { name: 'Planes' }))
    expect(document.querySelector('.admin-velo')).toBeNull()
  })

  it('no roba el foco que el destino de Perfil ya gestionó', () => {
    viewportMovil()
    const destino = document.createElement('button')
    destino.textContent = 'Foco del modal de perfil'
    document.body.append(destino)
    try {
      montarLayout(rol, () => destino.focus())
      fireEvent.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }))
      fireEvent.click(screen.getByRole('button', { name: 'Mi perfil' }))
      expect(document.activeElement).toBe(destino)
    } finally {
      destino.remove()
    }
  })

  it('mantiene los enlaces y el acceso al perfil en escritorio sin overlay', () => {
    viewportMovil(false)
    const abrirPerfil = vi.fn()
    montarLayout(rol, abrirPerfil)
    expect(screen.getAllByRole('link')).toHaveLength(6)
    expect(screen.queryByRole('button', { name: 'Abrir menú de navegación' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Mi perfil' }))
    expect(abrirPerfil).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.admin-velo')).toBeNull()
  })
})

describe('SPEC-29 presentación sin cambios de datos', () => {
  it('conserva los handlers de selección comercial y sus estados pressed', () => {
    function Esquema() {
      const [value, onChange] = useState({ esquema: 'TRAMOS', tramos: [{ porcentaje_id: '8', meses: 3 }], beneficios: {} })
      return <DiscountSelector value={value} onChange={onChange} politica={{ porcentajes_comerciales: [{ id: '8', porcentaje: '30.00' }], comercial_fijo_meses_max: 12 }} />
    }
    render(<Esquema />)
    const grupo = screen.getByRole('group', { name: 'Esquema comercial' })
    const [tramos, fijo] = within(grupo).getAllByRole('button')
    expect(tramos.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(fijo)
    expect(fijo.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByLabelText('Descuento tramo 1').value).toBe('8')
    expect(screen.getByLabelText('Meses tramo 1').value).toBe('3')
    fireEvent.click(tramos)
    expect(tramos.getAttribute('aria-pressed')).toBe('true')
  })

  it('preserva nombres, coberturas y observaciones largos al abrir y cerrar el plan', async () => {
    viewportMovil()
    const detalle = 'Odontología e Implantes|Cobertura integral|Permanencia mínima de doce meses sin interrupciones.'
    const api = { listarPlanes: vi.fn().mockResolvedValue({ planes: [{ id: 7, nombre: 'RUBÍ', detalles: detalle }] }) }
    render(<MemoryRouter><ConsultaPlanes api={api} etiqueta="Catálogo" rutaTarifario="/asesor/precios" /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalles' }))
    expect(screen.getByText('Odontología e Implantes')).toBeTruthy()
    expect(screen.getByText('Cobertura integral')).toBeTruthy()
    expect(screen.getByText('Permanencia mínima de doce meses sin interrupciones.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar detalles' }))
    expect(document.querySelector('.admin-plan-card__body')).toBeNull()
    expect(api.listarPlanes).toHaveBeenCalledTimes(1)
  })
})
