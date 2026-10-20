import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PlanesPage } from '../src/features/admin/pages/PlanesPage.jsx'
import { TarifarioPage } from '../src/features/admin/pages/TarifarioPage.jsx'
import { adminApi } from '../src/features/admin/api/adminApi.js'
import { SessionContext } from '../src/features/auth/context/SessionContext.js'
import { ApiError } from '../src/shared/lib/httpClient.js'

vi.mock('../src/features/admin/api/adminApi.js', () => ({
  adminApi: {
    listarPlanes: vi.fn().mockResolvedValue({ planes: [] }),
    consultarTarifario: vi.fn().mockResolvedValue({ tarifas: [] }),
  },
}))

const sesionAdmin = {
  status: 'authenticated', error: null,
  user: { legajo: '0000000001', rol: 'ADMIN', estado: 'ACTIVO', nombre: 'Admin' },
}

/** Renderiza una pantalla ADMIN con sesión activa y destino de navegación simulado. */
function renderPantalla(componente, rutaInicial) {
  return render(
    <SessionContext.Provider value={sesionAdmin}>
      <MemoryRouter initialEntries={[rutaInicial]}>
        <Routes>
          <Route path="/admin/planes" element={<PlanesPage />} />
          <Route path="/admin/tarifario" element={<TarifarioPage />} />
          <Route path="*" element={<aside>PANTALLA_DESTINO</aside>} />
        </Routes>
      </MemoryRouter>
    </SessionContext.Provider>,
  )
}

/** Plan público sintético sin precios, según el contrato SL-2. */
function plan(overrides = {}) {
  return {
    id: 2, nombre: 'PLAN EJEMPLO', detalles: 'Detalle público', condiciones_generales: 'Condiciones públicas',
    ...overrides,
  }
}

/** Plan secundario con textos propios para verificar exclusión mutua de paneles. */
function planSecundario() {
  return plan({ id: 3, nombre: 'PLAN OTRO', detalles: 'Detalles del otro', condiciones_generales: 'Condiciones del otro' })
}

/** Devuelve la tarjeta `article` del plan cuyo nombre se indique. */
function tarjetaDe(nombre) {
  return within(screen.getByText(nombre).closest('article'))
}

/** Matriz vigente sintética con dos tarifas en cualquier orden de llegada. */
function matriz(overrides = {}) {
  return {
    plan: { id: 2, nombre: 'PLAN EJEMPLO' },
    tipo_ingreso: 'Obligatorio',
    version: { id: '27', tipo: 'CARGA_INICIAL', estado: 'ACTIVA', fecha_activacion: '2026-10-19T16:37:25.841Z' },
    tarifas: [
      { rango_clave: 'HIJO 0-1', rango_etario: 'HIJO 0-1(*)', rango_nota: '(*)', precio: '50.25' },
      { rango_clave: '0-25', rango_etario: '0-25', rango_nota: null, precio: '100.00' },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  adminApi.listarPlanes.mockResolvedValue({ planes: [] })
  adminApi.consultarTarifario.mockResolvedValue(matriz())
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('PlanesPage (SL-2E, catálogo desplegable)', () => {
  it('muestra siempre los planes con nombre y deja los detalles contraídos por defecto', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [plan(), planSecundario()] })
    renderPantalla(<PlanesPage />, '/admin/planes')

    expect(await screen.findByText('PLAN EJEMPLO')).toBeTruthy()
    expect(screen.getByText('PLAN OTRO')).toBeTruthy()
    // Contraídos: los paneles de ambas tarjetas quedan ocultos.
    expect(document.getElementById('plan-2-detalles').hasAttribute('hidden')).toBe(true)
    expect(document.getElementById('plan-3-detalles').hasAttribute('hidden')).toBe(true)
    expect(tarjetaDe('PLAN EJEMPLO').getByRole('button', { name: 'Ver detalles' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ocultar detalles' })).toBeNull()
    expect(tarjetaDe('PLAN EJEMPLO').getByRole('button', { name: 'Ver tarifas' })).toBeTruthy()
  })

  it('expande solo el plan seleccionado y contrae el anterior', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [plan(), planSecundario()] })
    renderPantalla(<PlanesPage />, '/admin/planes')

    expect(await screen.findByText('PLAN EJEMPLO')).toBeTruthy()
    expect(document.getElementById('plan-2-detalles').hasAttribute('hidden')).toBe(true)

    fireEvent.click(tarjetaDe('PLAN EJEMPLO').getByRole('button', { name: 'Ver detalles' }))
    expect(await screen.findByText('Detalle público')).toBeTruthy()
    expect(document.getElementById('plan-2-detalles').hasAttribute('hidden')).toBe(false)

    fireEvent.click(tarjetaDe('PLAN OTRO').getByRole('button', { name: 'Ver detalles' }))
    await screen.findByText('Detalles del otro')
    expect(document.getElementById('plan-3-detalles').hasAttribute('hidden')).toBe(false)
    // El plan anterior vuelve a contraerse al elegir otro plan.
    expect(document.getElementById('plan-2-detalles').hasAttribute('hidden')).toBe(true)
  })

  it('permite cerrar el plan abierto con su mismo control', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [plan(), planSecundario()] })
    renderPantalla(<PlanesPage />, '/admin/planes')

    expect(await screen.findByText('PLAN EJEMPLO')).toBeTruthy()
    fireEvent.click(tarjetaDe('PLAN EJEMPLO').getByRole('button', { name: 'Ver detalles' }))
    expect(await screen.findByText('Detalle público')).toBeTruthy()
    expect(document.getElementById('plan-2-detalles').hasAttribute('hidden')).toBe(false)

    fireEvent.click(tarjetaDe('PLAN EJEMPLO').getByRole('button', { name: 'Ocultar detalles' }))
    expect(document.getElementById('plan-2-detalles').hasAttribute('hidden')).toBe(true)
  })

  it('conecta el control con su panel por aria-expanded, aria-controls y hidden', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [plan()] })
    renderPantalla(<PlanesPage />, '/admin/planes')

    const boton = await screen.findByRole('button', { name: 'Ver detalles' })
    expect(boton.getAttribute('aria-expanded')).toBe('false')
    expect(boton.getAttribute('aria-controls')).toBe('plan-2-detalles')
    expect(document.getElementById('plan-2-detalles').hasAttribute('hidden')).toBe(true)

    fireEvent.click(boton)
    expect(boton.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById('plan-2-detalles').hasAttribute('hidden')).toBe(false)
    expect(screen.getByText('Detalle público')).toBeTruthy()
  })

  it('muestra el vacío con 200 y colección vacía', async () => {
    renderPantalla(<PlanesPage />, '/admin/planes')

    expect(await screen.findByText('No hay planes activos.')).toBeTruthy()
  })

  it('presenta rechazos de negocio sin exponer detalles técnicos', async () => {
    adminApi.listarPlanes.mockRejectedValue(new ApiError({
      status: 409, code: 'ADMIN_ESTADO', message: 'El catalogo no esta disponible.',
    }))
    renderPantalla(<PlanesPage />, '/admin/planes')

    expect(await screen.findByText('La consulta fue rechazada')).toBeTruthy()
    expect(screen.getByText('El catalogo no esta disponible.')).toBeTruthy()
  })

  it('navega al tarifario con el plan y la modalidad inicial', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [plan()] })
    renderPantalla(<PlanesPage />, '/admin/planes')

    fireEvent.click(await screen.findByRole('button', { name: 'Ver tarifas' }))
    // La navegación resuelve la pantalla de Gestión de Precios del shell.
    await screen.findByText('Versión 27 · CARGA_INICIAL')
    expect(adminApi.consultarTarifario).toHaveBeenCalledWith('2', 'Obligatorio')
  })
})

describe('TarifarioPage (SL-2, RF-D07)', () => {
  it('consulta la modalidad inicial al montar con enlace de plan', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [plan()] })
    adminApi.consultarTarifario.mockResolvedValue(matriz())
    renderPantalla(<TarifarioPage />, '/admin/tarifario?planId=2&modalidad=Obligatorio')

    await screen.findByText('Versión 27 · CARGA_INICIAL')
    expect(adminApi.consultarTarifario).toHaveBeenCalledWith('2', 'Obligatorio')
  })

  it('mantiene la modalidad por defecto cuando la URL no la define', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [plan()] })
    adminApi.consultarTarifario.mockResolvedValue(matriz())
    renderPantalla(<TarifarioPage />, '/admin/tarifario?planId=2')

    await screen.findByText('Versión 27 · CARGA_INICIAL')
    expect(adminApi.consultarTarifario).toHaveBeenCalledWith('2', 'Obligatorio')
  })

  it('solicita la modalidad Voluntario desde la pestaña correspondiente', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [plan()] })
    adminApi.consultarTarifario.mockResolvedValue(matriz())
    renderPantalla(<TarifarioPage />, '/admin/tarifario?planId=2')

    await screen.findByText('Versión 27 · CARGA_INICIAL')
    fireEvent.click(screen.getByRole('button', { name: 'Voluntario' }))
    await waitFor(() => expect(adminApi.consultarTarifario).toHaveBeenCalledWith('2', 'Voluntario'))
  })

  it('cambia de plan sin soltar la modalidad activa', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [plan(), plan({ id: 3, nombre: 'PLAN TRES' })] })
    adminApi.consultarTarifario.mockResolvedValue(matriz())
    renderPantalla(<TarifarioPage />, '/admin/tarifario?planId=2&modalidad=Voluntario')

    await screen.findByText('Versión 27 · CARGA_INICIAL')
    fireEvent.change(screen.getByLabelText('Plan'), { target: { value: '3' } })
    await waitFor(() => expect(adminApi.consultarTarifario).toHaveBeenCalledWith('3', 'Voluntario'))
  })

  it('ordena el listado en el orden provisto por el servidor y conserva el precio como cadena', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [plan()] })
    adminApi.consultarTarifario.mockResolvedValue(matriz())
    renderPantalla(<TarifarioPage />, '/admin/tarifario?planId=2')

    const tabla = await screen.findByRole('table')
    const cuerpo = within(tabla.tBodies[0])
    const claves = (await cuerpo.findAllByRole('row')).map((fila) => fila.textContent)
    // El importe se formatea visualmente; la cadena original permanece intácta en la API.
    await screen.findByText('$ 50,25')
    expect(await cuerpo.findByText('HIJO 0-1')).toBeTruthy()
    expect(claves[0]).toContain('HIJO 0-1')
    expect(claves[1]).toContain('0-25')
    expect(typeof adminApi.consultarTarifario.mock.calls[0][0]).toBe('string')
  })

  it('presenta los importes de la tabla en formato ARS con miles, coma y dos decimales', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [plan()] })
    adminApi.consultarTarifario.mockResolvedValue(matriz({
      tarifas: [
        { rango_clave: 'HIJO 0-1', rango_etario: 'HIJO 0-1(*)', rango_nota: '(*)', precio: '404808.93' },
        { rango_clave: '0-25', rango_etario: '0-25', rango_nota: null, precio: '1299008.41' },
        { rango_clave: '66+', rango_etario: '66-00', rango_nota: null, precio: '0.00' },
      ],
    }))
    renderPantalla(<TarifarioPage />, '/admin/tarifario?planId=2')

    expect(await screen.findByText('$ 404.808,93')).toBeTruthy()
    expect(screen.getByText('$ 1.299.008,41')).toBeTruthy()
    expect(screen.getByText('$ 0,00')).toBeTruthy()
  })

  it('presenta colecciones vacías de la versión vigente', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [plan()] })
    adminApi.consultarTarifario.mockResolvedValue(matriz({ tarifas: [] }))
    renderPantalla(<TarifarioPage />, '/admin/tarifario?planId=2')

    expect(await screen.findByText('Sin tarifas activas para la selección.')).toBeTruthy()
  })

  it('explica el rechazo de negocio del backend sin datos sensibles', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [] })
    adminApi.consultarTarifario.mockRejectedValue(new ApiError({
      status: 400, code: 'ADMIN_VALIDACION', message: 'Los parametros no son validos.',
    }))
    renderPantalla(<TarifarioPage />, '/admin/tarifario?planId=2')

    expect(await screen.findByText('La consulta fue rechazada')).toBeTruthy()
  })
})

describe('presentación de coberturas y glosario (SL-2E, tabla conservadora)', () => {
  /** Plan con la forma real de la fuente: dos registros de tres campos y uno ambiguo. */
  function planConFuenteReal() {
    return plan({
      detalles: 'Consultas Médicas| SC|NO\nMaterial Descartable Internación | 100%|NO\n  Plan Materno Infantil | 100% CT-CL',
      condiciones_generales: 'Cobertura: prueba.\n\nReferencias: SC (Sin Cargo) | NA (No Acumulable)',
    })
  }

  it('presenta la tabla semántica con tres encabezados y separa los registros inequívocos', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [planConFuenteReal()] })
    renderPantalla(<PlanesPage />, '/admin/planes')

    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalles' }))
    const tabla = tarjetaDe('PLAN EJEMPLO').getByRole('table')
    const encabezados = within(tabla).getAllByRole('columnheader').map((th) => th.textContent)
    expect(encabezados).toEqual(['Prestación', 'Cobertura', 'Observaciones'])
    // Tres columnas declaradas para las proporciones de colgroup en admin.css.
    expect(tabla.querySelectorAll('col')).toHaveLength(3)
    // Las celdas contienen los campos separados, no la cadena con separadores.
    expect(within(tabla).getByRole('cell', { name: 'Consultas Médicas' })).toBeTruthy()
    expect(within(tabla).getByRole('cell', { name: 'SC' })).toBeTruthy()
    // `NO` se conserva literal en cada Observaciones; no se traduce.
    expect(within(tabla).getAllByRole('cell', { name: 'NO' })).toHaveLength(2)
    expect(within(tabla).queryByText('Consultas Médicas| SC|NO')).toBeNull()
  })

  it('muestra el registro ambiguo completo en una fila extendida con “Detalle original”', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [planConFuenteReal()] })
    renderPantalla(<PlanesPage />, '/admin/planes')

    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalles' }))
    const tabla = tarjetaDe('PLAN EJEMPLO').getByRole('table')
    const extendida = document.querySelector('.admin-plan-tabla__fila-completa td')
    expect(extendida).toBeTruthy()
    expect(extendida.getAttribute('colspan')).toBe('3')
    expect(extendida.textContent).toContain('Detalle original')
    expect(extendida.textContent).toContain('Plan Materno Infantil | 100% CT-CL')
    // No se inventan correspondencias: el texto ambiguo no aparece como columna.
    expect(within(tabla).queryByRole('cell', { name: 'Plan Materno Infantil' })).toBeNull()
    expect(within(tabla).queryByRole('cell', { name: '100% CT-CL' })).toBeNull()
  })

  it('mantiene el número y el orden de los registros de la fuente', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [planConFuenteReal()] })
    renderPantalla(<PlanesPage />, '/admin/planes')

    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalles' }))
    const filas = document.querySelectorAll('.admin-plan-tabla tbody tr')
    expect(filas).toHaveLength(3)
    const primeraColumna = Array.from(filas, (fila) => fila.cells[0].textContent)
    expect(primeraColumna[0]).toBe('Consultas Médicas')
    expect(primeraColumna[1]).toBe('Material Descartable Internación')
    expect(primeraColumna[2]).toContain('Plan Materno Infantil | 100% CT-CL')
  })

  it('mantiene el texto íntegro de un registro sin separador como detalle original', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [planSecundario()] })
    renderPantalla(<PlanesPage />, '/admin/planes')

    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalles' }))
    const extendida = document.querySelector('.admin-plan-tabla__fila-completa td')
    expect(extendida.textContent).toContain('Detalle original')
    expect(extendida.textContent).toContain('Detalles del otro')
  })

  it('separa el glosario de referencias del cuerpo de condiciones solo si existe', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [planConFuenteReal()] })
    renderPantalla(<PlanesPage />, '/admin/planes')

    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalles' }))
    expect(await screen.findByText('Glosario de referencias')).toBeTruthy()
    expect(await screen.findByText('Referencias: SC (Sin Cargo) | NA (No Acumulable)')).toBeTruthy()
    expect(await screen.findByText('Cobertura: prueba.')).toBeTruthy()
  })

  it('mantiene el texto completo sin bloque de glosario cuando no existe el prefijo', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [planSecundario()] })
    renderPantalla(<PlanesPage />, '/admin/planes')

    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalles' }))
    expect(await screen.findByText('Condiciones del otro')).toBeTruthy()
    expect(screen.queryByText('Glosario de referencias')).toBeNull()
  })

  it('muestra el nuevo texto de orientación sin términos de implementación', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [plan()] })
    renderPantalla(<PlanesPage />, '/admin/planes')

    expect(await screen.findByText('Consultá las tarifas actualizadas de cada plan en Gestión de Precios.')).toBeTruthy()
    // La frase anterior, con referencia a implementación, ya no aparece.
    expect(screen.queryByText(/versión vigente del backend/)).toBeNull()
  })

  it('muestra el marcador de vacío cuando el plan no trae detalles', async () => {
    adminApi.listarPlanes.mockResolvedValue({ planes: [plan({ detalles: null })] })
    renderPantalla(<PlanesPage />, '/admin/planes')

    fireEvent.click(await screen.findByRole('button', { name: 'Ver detalles' }))
    expect(await screen.findByText('—')).toBeTruthy()
  })
})

describe('candado de layout del shell ADMIN (SL-2E, corrección de desplazamientos)', () => {
  it('el lienzo fluye sin tope fijo y la tabla conserva proporciones de columna', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../src/features/admin/admin.css'), 'utf8')
    // Sin max-width en el lienzo central: antes el tope fijo dejaba una franja
    // estrecha de contenido con vacío excesivo a la derecha en pantallas anchas.
    // Tampoco width:100%: con box-sizing por defecto suma el padding y desborda
    // la pista (51,2 px verificados en navegador); el estiramiento del ítem
    // de cuadrícula ya llena el lienzo.
    expect(css).not.toMatch(/\.admin-content\s*\{[^}]*max-width/)
    expect(css).not.toMatch(/\.admin-content\s*\{[^}]*width:\s*100%/)
    // La pista del lienzo no puede crecer por el min-content de la tabla abierta.
    expect(css).toMatch(/\.admin-canvas\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/)
    // Layout fijo: prestaciones extensas ocupan varias líneas sin deformar
    // la tabla, con anchos en porcentaje (compatibles con el zoom).
    expect(css).toMatch(/\.admin-plan-tabla\s*\{[^}]*table-layout:\s*fixed/)
    expect(css).toMatch(/\.admin-plan-tabla col:nth-child\(1\)\s*\{[^}]*width:\s*46%/)
    expect(css).toMatch(/\.admin-plan-tabla col:nth-child\(2\)\s*\{[^}]*width:\s*27%/)
    expect(css).toMatch(/\.admin-plan-tabla col:nth-child\(3\)\s*\{[^}]*width:\s*27%/)
  })

  it('bloquea el documento en escritorio y habilita el scroll interno del lienzo', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../src/features/admin/admin.css'), 'utf8')
    const bloqueEscritorio = css.match(/@media\s*\(min-width:\s*901px\)\s*\{[\s\S]*?\n\}/)
    expect(bloqueEscritorio).toBeTruthy()
    const reglas = bloqueEscritorio[0]
    // El shell queda clavado al viewport: ninguna pantalla estira el documento.
    expect(reglas).toMatch(/\.admin-shell\s*\{[^}]*height:\s*100dvh/)
    expect(reglas).toMatch(/\.admin-shell\s*\{[^}]*overflow:\s*hidden/)
    // Único scroll vertical: el contenido del lienzo central.
    expect(reglas).toMatch(/\.admin-content\s*\{[^}]*overflow-y:\s*auto/)
    // La barra lateral conserva su altura dentro del viewport y la navegación
    // absorbe el desbordamiento para que la tarjeta «Mi perfil» no se mueva.
    expect(reglas).toMatch(/\.admin-sidebar\s*\{[^}]*height:\s*100%/)
    expect(reglas).toMatch(/\.admin-nav\s*\{[^}]*overflow-y:\s*auto/)
  })

  it('convierte la tabla en fichas apiladas con etiquetas en móvil, sin posiciones fijas', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../src/features/admin/admin.css'), 'utf8')
    // Existen varios bloques de 720px (tarifario y tarjetas): se toma el de la tabla.
    let movil = null
    for (const bloque of css.matchAll(/@media\s*\(max-width:\s*720px\)\s*\{[\s\S]*?\n\}/g)) {
      if (bloque[0].includes('admin-plan-tabla')) movil = bloque[0]
    }
    expect(movil).toBeTruthy()
    // El encabezado desaparece y cada celda gana su etiqueta visible.
    expect(movil).toMatch(/\.admin-plan-tabla thead\s*\{[^}]*display:\s*none/)
    expect(movil).toMatch(/content:\s*attr\(data-label\)/)
    // La fila extendida conserva su propia indicación, sin etiquetas ajenas.
    expect(movil).toMatch(/\.admin-plan-tabla tr\.admin-plan-tabla__fila-completa td::before\s*\{[^}]*content:\s*none/)
    // Sin desplazamiento horizontal del documento en móvil.
    expect(movil).not.toMatch(/overflow-x/)
  })

  it('no usa posiciones fijas para el anclaje de topbar ni sidebar', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../src/features/admin/admin.css'), 'utf8')
    expect(css).not.toMatch(/\.admin-(shell|topbar|sidebar)\s*\{[^}]*position:\s*fixed/)
    expect(css).not.toMatch(/\.admin-(shell|topbar|content)\s*\{[^}]*position:\s*sticky/)
  })
})

describe('visibilidad real del panel desplegable (SL-2E, caída CSS del atributo hidden)', () => {
  /**
   * Inyecta en el héroe de la prueba las dos reglas en competencia de
   * `admin.css`: la clase del panel y la guardia `[hidden]`. Con la hoja en
   * el documento, `getComputedStyle` replica la cascada real del navegador
   * (las reglas de autor vencen a la del agente de usuario) y permite
   * comprobar la visibilidad efectiva, no solo el atributo.
   * @returns {HTMLStyleElement} Nodo de estilos para retirar al terminar.
   */
  function aplicarReglasProduccion() {
    const estilos = document.createElement('style')
    // Réplicas literales de admin.css: mantener sincronizadas al editarlas.
    estilos.textContent = [
      '.admin-plan-card__body { border-top: 1px solid #dcd6e9; padding: 1rem; }',
      '.admin-plan-card__body > * + * { margin-top: 0.75rem; }',
      '.admin-plan-card__body[hidden] { display: none; }',
    ].join('\n')
    estilos.setAttribute('data-test-rules', 'planes-panel')
    document.head.appendChild(estilos)
    return estilos
  }

  /**
   * Devuelve el panel de detalles de un plan según su id del DTO.
   * @param {string|number} planId Identificador del plan.
   * @returns {HTMLElement} Nodo del panel de detalles.
   */
  function panelDe(planId) {
    const panel = document.getElementById(`plan-${planId}-detalles`)
    expect(panel).toBeTruthy()
    return panel
  }

  afterEach(() => {
    // Los nodos <style> agregados aquí no son limpiados por RTL.
    document.querySelectorAll('style[data-test-rules]').forEach((estilos) => estilos.remove())
  })

  it('la hoja de estilos producción declara la guardia [hidden] del panel', () => {
    const css = readFileSync(resolve(import.meta.dirname, '../src/features/admin/admin.css'), 'utf8')
    expect(css).toMatch(/\.admin-plan-card__body\[hidden\]\s*\{\s*display:\s*none;/)
    // El panel no debe declarar display propio en su clase base: esa regla era
    // la causa raíz que anulaba la ocultación del atributo [hidden].
    expect(css).not.toMatch(/\.admin-plan-card__body\s*\{[^}]*\bdisplay:\s*grid/)
  })

  it('oculta de verdad el panel al cerrar y jamás deja dos planes desplegados', async () => {
    const estilos = aplicarReglasProduccion()
    estilos.setAttribute('data-test-rules', 'planes-panel')
    adminApi.listarPlanes.mockResolvedValue({ planes: [plan(), planSecundario()] })
    renderPantalla(<PlanesPage />, '/admin/planes')

    // Inicialmente todos contraídos: display none efectivo, no solo atributo.
    expect(await screen.findByText('PLAN EJEMPLO')).toBeTruthy()
    expect(getComputedStyle(panelDe(2)).display).toBe('none')
    expect(getComputedStyle(panelDe(3)).display).toBe('none')

    // Abrir RUBÍ: su panel es visible (display no none) y el otro sigue oculto.
    fireEvent.click(tarjetaDe('PLAN EJEMPLO').getByRole('button', { name: 'Ver detalles' }))
    expect(getComputedStyle(panelDe(2)).display).not.toBe('none')
    expect(getComputedStyle(panelDe(3)).display).toBe('none')

    // Abrir ESMERALDA: RUBÍ vuelve a display none real — nunca hay dos abiertos.
    fireEvent.click(tarjetaDe('PLAN OTRO').getByRole('button', { name: 'Ver detalles' }))
    expect(getComputedStyle(panelDe(3)).display).not.toBe('none')
    expect(getComputedStyle(panelDe(2)).display).toBe('none')

    // «Ocultar detalles» oculta efectivamente el contenido del plan abierto.
    fireEvent.click(tarjetaDe('PLAN OTRO').getByRole('button', { name: 'Ocultar detalles' }))
    expect(getComputedStyle(panelDe(3)).display).toBe('none')
  })
})
