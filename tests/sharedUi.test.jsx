import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EncabezadoContextual } from '../src/shared/ui/EncabezadoContextual.jsx'
import { EncabezadoSuperior } from '../src/shared/ui/EncabezadoSuperior.jsx'
import { GemaPlan } from '../src/shared/ui/GemaPlan.jsx'
import { colorDePlan } from '../src/shared/ui/gemasPlan.js'

describe('EncabezadoContextual (diseño ASESOR compartido con ADMIN)', () => {
  it('presenta etiqueta con punto pulsante, título y descripción', () => {
    render(
      <EncabezadoContextual
        etiqueta="Módulo ADMIN · Catálogo oficial"
        titulo="Catálogo de planes"
        descripcion="Consultá los planes activos publicados en el tarifario."
      />,
    )

    expect(screen.getByText('Módulo ADMIN · Catálogo oficial')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Catálogo de planes' })).toBeTruthy()
    expect(screen.getByText('Consultá los planes activos publicados en el tarifario.')).toBeTruthy()
    // El punto pulsante es decorativo: el texto de la etiqueta queda accesible.
    expect(document.querySelector('.ui-encabezado__punto')).toBeTruthy()
  })

  it('omite las piezas que no recibe y no reserva acciones vacías', () => {
    render(<EncabezadoContextual titulo="Matriz de tarifas vigente" />)

    expect(screen.getByRole('heading', { name: 'Matriz de tarifas vigente' })).toBeTruthy()
    expect(screen.queryByText(/Consultá/)).toBeNull()
    expect(document.querySelector('.ui-encabezado__etiqueta')).toBeNull()
    expect(document.querySelector('.ui-encabezado__acciones')).toBeNull()
  })

  it('expone las acciones a la derecha cuando el módulo las aporta', () => {
    render(
      <EncabezadoContextual etiqueta="Tarifario comercial" acciones={<button type="button">Exportar</button>} />,
    )

    expect(document.querySelector('.ui-encabezado__acciones')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeTruthy()
  })
})

describe('EncabezadoSuperior (shell compartido ADMIN / ASESOR)', () => {
  const usuario = { nombre: 'Yurlian', apellido: 'Sivira', rol: 'ADMIN' }

  it('muestra la sección, la identidad real de la sesión y la salida con icono', () => {
    render(<EncabezadoSuperior seccion="Planes" usuario={usuario} onCerrarSesion={() => {}} />)

    expect(screen.getByRole('heading', { name: 'Planes' })).toBeTruthy()
    expect(screen.getByText('Yurlian Sivira')).toBeTruthy()
    expect(screen.getByText('ADMIN')).toBeTruthy()
    // Isotipo de MATISTA sobre su baldosa oscura.
    expect(document.querySelector('.ui-cabecera__marca img')).toBeTruthy()
    // El botón de salida usa el icono del diseño aprobado.
    const boton = screen.getByRole('button', { name: 'Cerrar sesión' })
    expect(boton.querySelector('svg')).toBeTruthy()
  })

  it('no inventa identidad cuando la sesión no trae nombre', () => {
    render(<EncabezadoSuperior seccion="Versiones" usuario={{ rol: 'ASESOR' }} onCerrarSesion={() => {}} />)

    expect(screen.getByText('—')).toBeTruthy()
    expect(screen.getByText('ASESOR')).toBeTruthy()
  })

  it('ejecuta la acción de cierre de sesión que entrega el módulo', () => {
    const onCerrarSesion = vi.fn()
    render(<EncabezadoSuperior seccion="Planes" usuario={usuario} onCerrarSesion={onCerrarSesion} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(onCerrarSesion).toHaveBeenCalledTimes(1)
  })
})

describe('GemaPlan (paleta del catálogo ASESOR aprobado)', () => {
  it('resuelve cada plan aprobado a su clase de paleta', () => {
    render(
      <>
        <GemaPlan nombre="PLAN RUBÍ" />
        <GemaPlan nombre="ESMERALDA" />
        <GemaPlan nombre="Zafiro" />
        <GemaPlan nombre="DIAMANTE" />
      </>,
    )

    expect(document.querySelectorAll('.ui-gema--rubi svg')).toHaveLength(1)
    expect(document.querySelectorAll('.ui-gema--esmeralda svg')).toHaveLength(1)
    expect(document.querySelectorAll('.ui-gema--zafiro svg')).toHaveLength(1)
    expect(document.querySelectorAll('.ui-gema--diamante svg')).toHaveLength(1)
  })

  it('cautela a gemas neutras los nombres desconocidos y aceptan sin diacríticos', () => {
    render(
      <>
        <GemaPlan nombre="PLAN AUMENTA 2027" />
        <GemaPlan nombre="RUBI" tamano="ficha" />
      </>,
    )

    // Sin coincidencia en la paleta, el tono slate neutral evita gemas rotas.
    expect(document.querySelectorAll('.ui-gema--neutra svg')).toHaveLength(1)
    // El tamaño de ficha solo cambia la escala, no la paleta.
    expect(document.querySelector('.ui-gema--rubi.ui-gema--ficha svg')).toBeTruthy()
  })

  it('colorDePlan expone el acento para los puntos de las tablas', () => {
    expect(colorDePlan('ESMERALDA')).toBe('#059669')
    expect(colorDePlan('PLAN RUBÍ')).toBe('#dc2626')
    expect(colorDePlan(null)).toBe('#64748b')
    expect(colorDePlan('PLAN DESCONOCIDO')).toBe('#64748b')
  })
})
