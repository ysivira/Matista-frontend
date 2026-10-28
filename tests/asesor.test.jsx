/**
 * ============================================================
 * MATISTA | PRUEBAS DEL FLUJO COMERCIAL
 * ============================================================
 *
 * Archivo: asesor.test.jsx
 * Módulo: Pruebas del asesor
 *
 * Responsabilidad:
 * Probar clientes, familia, validación remota, previsualización
 * y emisión con API simulada, sin calcular economía en React.
 *
 * ============================================================
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom'
import { httpClient } from '../src/shared/lib/httpClient.js'
import { SessionContext } from '../src/features/auth/context/SessionContext.js'
import { ClientSearch } from '../src/features/asesor/components/ClientSearch.jsx'
import { ComercialDashboard } from '../src/features/asesor/pages/ComercialDashboard.jsx'
import { QuoteForm } from '../src/features/asesor/pages/QuoteForm.jsx'
import { QuoteDetail } from '../src/features/asesor/pages/QuoteDetail.jsx'
import { ListasPage } from '../src/features/asesor/pages/ListasPage.jsx'
import { EconomicPreview } from '../src/features/asesor/components/EconomicPreview.jsx'
import { QuoteSummary } from '../src/features/asesor/components/QuoteSummary.jsx'
import { QuoteHistory } from '../src/features/asesor/pages/QuoteHistory.jsx'
import { DiscountSelector } from '../src/features/asesor/components/DiscountSelector.jsx'
import { useState } from 'react'
import { useCommercialValidation } from '../src/features/asesor/hooks/useCommercialValidation.js'
import { FamilyGroupEditor } from '../src/features/asesor/components/FamilyGroupEditor.jsx'
import { QuoteReview } from '../src/features/asesor/components/QuoteReview.jsx'

/** Monta edición y validación remota con un borrador inicial opcional, sin replicar políticas comerciales. */
function CampanaValidable({ inicial }) {
  const [value, setValue] = useState(inicial ?? { ...entrada.condiciones, esquema: 'TRAMOS', tramos: [{ porcentaje_id: '8', meses: 3 }] })
  const validacion = useCommercialValidation()
  return <DiscountSelector value={value} politica={politica} validacion={validacion} onChange={nuevo => { validacion.editar(); setValue(nuevo) }} />
}

vi.mock('../src/shared/lib/httpClient.js', () => ({ httpClient: { request: vi.fn() } }))
const familia = { titular: { edad: 25, estado_civil: 'SOLTERO' }, miembros: [] }
const cliente = { id: '3', dni: '12345678', nombres: 'Titular', apellidos: 'Prueba', familia, revision: 1, edad_declarada: 25, email: 'titular@example.test' }
const politica = { id: '5', porcentajes_comerciales: [{ id: '8', porcentaje: '30.00' }], comercial_fijo_meses_max: 12, comercial_escalonado_tramos_max: 4, tdc_habilitado: 1, tdc_pct: '5.00' }
const entrada = { cliente_id: '3', plan_id: '1', modalidad: 'Voluntario', familia, aportes: {}, condiciones: { tramos: [], tdc: false, beneficios: { solicita_afinidad: false } } }

/** Monta componentes comerciales sin servidor y con las rutas reales que requieren parámetros. */
function montar(element, path = '/') {
  const router = createMemoryRouter([{ path: '/asesor/cotizaciones/:id', element }, { path: '*', element }], { initialEntries: [path] })
  return render(<RouterProvider router={router} />)
}

beforeEach(() => {
  vi.resetAllMocks()
  /** Simula solo respuestas del servidor; no introduce cálculos económicos en el arnés. */
  httpClient.request.mockImplementation(async ruta => {
    if (ruta === '/api/asesor/condiciones/validacion') return { errores: [] }
    if (ruta === '/api/catalogo/planes') return { planes: [{ id: 1, nombre: 'RUBÍ' }] }
    if (ruta === '/api/catalogo/condiciones') return { politica, categorias_monotributo: ['A', 'K'], motor_disponible: true }
    if (ruta === '/api/asesor/clientes/3') return cliente
    if (ruta === '/api/asesor/clientes?pagina=1') return { clientes: [] }
    if (ruta.startsWith('/api/catalogo/tarifario/planes/')) return { version: { id: '7' }, tipo_ingreso: 'Obligatorio', tarifas: [{ rango_clave: '0-25', rango_etario: '0 a 25', precio: '123.45' }] }
    throw new Error('Ruta no prevista por la prueba')
  })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('ASESOR con cálculo autoritativo', () => {
  /** El formulario compartido convierte identidad al escribir sin modificar contacto ni ubicación. */
  it('SPEC20 alta muestra y envía nombres compuestos con tildes y Ñ en mayúsculas', async () => {
    const seleccionar = vi.fn()
    httpClient.request.mockResolvedValueOnce({ encontrado: false }).mockImplementationOnce(async (_ruta, opciones) => ({ ...opciones.body, id: '4', revision: 0 }))
    montar(<ClientSearch onSelect={seleccionar} />)
    fireEvent.change(screen.getByLabelText('DNI'), { target: { value: '12345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar cliente' }))
    fireEvent.change(await screen.findByLabelText('Nombres'), { target: { value: 'maría josé' } })
    fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'pérez muñoz' } })
    for (const [campo, valor] of [['Correo electrónico', 'Maria.Jose@example.test'], ['Teléfono', '+54 11 5555-0000'], ['Provincia', 'Córdoba'], ['Localidad', 'Villa María'], ['Edad', '25']]) {
      fireEvent.change(screen.getByLabelText(campo), { target: { value: valor } })
    }
    expect(screen.getByLabelText('Nombres').value).toBe('MARÍA JOSÉ')
    expect(screen.getByLabelText('Apellidos').value).toBe('PÉREZ MUÑOZ')
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente: Configurar Cotización' }))
    await waitFor(() => expect(seleccionar).toHaveBeenCalled())
    expect(httpClient.request.mock.calls[1][1]).toMatchObject({ method: 'POST', body: { dni: '12345678', nombres: 'MARÍA JOSÉ', apellidos: 'PÉREZ MUÑOZ', email: 'Maria.Jose@example.test', telefono: '+54 11 5555-0000', provincia: 'Córdoba', localidad: 'Villa María' } })
    expect(seleccionar.mock.calls[0][0].nombres).toBe('MARÍA JOSÉ')
  })

  /** Cargar datos legados no los normaliza ni guarda automáticamente; editar usa el mismo cambio central. */
  it('SPEC20 edición normaliza solo identidad modificada y preserva datos/revisión al guardar', async () => {
    const inicial = { ...cliente, direccion: 'Dirección histórica' }, antes = structuredClone(cliente)
    httpClient.request.mockImplementationOnce(async (_ruta, opciones) => ({ ...inicial, ...opciones.body, revision: 2 }))
    montar(<ClientSearch initialCliente={inicial} />)
    expect(screen.getByLabelText('Nombres').value).toBe('Titular')
    expect(httpClient.request).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Nombres'), { target: { value: 'juan carlos' } })
    fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: "muñoz d'angelo" } })
    expect(screen.getByLabelText('Nombres').value).toBe('JUAN CARLOS')
    expect(screen.getByLabelText('Apellidos').value).toBe("MUÑOZ D'ANGELO")
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cliente' }))
    await screen.findByText('Cliente guardado.')
    expect(httpClient.request.mock.calls[0]).toEqual(['/api/asesor/clientes/3', { method: 'PUT', body: expect.objectContaining({ nombres: 'JUAN CARLOS', apellidos: "MUÑOZ D'ANGELO", dni: cliente.dni, email: cliente.email, direccion: inicial.direccion, revision: 1 }) }])
    expect(cliente).toEqual(antes)
  })

  it('FIX07 cónyuge fija CASADO, impide duplicados y eliminarlo no presume soltería', () => {
    /** Conserva estado real del editor para comprobar secuencias de alta, cambio y eliminación. */
    function FamiliaEditable() {
      const [value, setValue] = useState({ titular: { edad: 25, estado_civil: 'OTRO' }, miembros: [{ parentesco: 'HIJO', edad: 27 }, { parentesco: 'HIJO', edad: 12 }] })
      return <FamilyGroupEditor value={value} onChange={setValue} />
    }
    render(<FamiliaEditable />)
    fireEvent.change(screen.getByLabelText('Parentesco 1'), { target: { value: 'CONYUGE' } })
    expect(screen.getByLabelText('Estado civil').value).toBe('CASADO')
    expect(screen.getByLabelText('Parentesco 2').querySelector('option[value=CONYUGE]').disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Parentesco 2'), { target: { value: 'CONYUGE' } })
    expect(screen.getByLabelText('Parentesco 2').value).toBe('HIJO')
    fireEvent.click(screen.getByRole('button', { name: 'Quitar integrante 1' }))
    expect(screen.getByLabelText('Estado civil').value).toBe('CASADO')
    fireEvent.change(screen.getByLabelText('Estado civil'), { target: { value: 'OTRO' } })
    expect(screen.getByLabelText('Estado civil').value).toBe('OTRO')
  })

  it('FIX07 adherentes manuales: cero válido, borrado sin error durante edición y validación al salir/continuar', async () => {
    montar(<QuoteForm />, '/asesor/nueva?cliente=3')
    fireEvent.change(await screen.findByLabelText('Plan de salud'), { target: { value: '1' } })
    fireEvent.click(screen.getByLabelText('Monotributo'))
    const campo = screen.getByLabelText('Cantidad de adherentes registrados en Monotributo')
    expect(campo.type).toBe('text'); expect(campo.inputMode).toBe('numeric'); expect(campo.value).toBe('0')
    expect(campo.checkValidity()).toBe(true)
    fireEvent.input(campo, { target: { value: '' } })
    expect(campo.value).toBe(''); expect(campo.getAttribute('aria-invalid')).toBe('false')
    fireEvent.blur(campo)
    expect(campo.getAttribute('aria-invalid')).toBe('true')
    for (const valor of ['0', '1', '2', '31']) {
      fireEvent.input(campo, { target: { value: valor } }); fireEvent.blur(campo)
      expect(campo.checkValidity()).toBe(true); expect(campo.getAttribute('aria-invalid')).toBe('false')
    }
    fireEvent.input(campo, { target: { value: '1.5' } })
    expect(campo.getAttribute('aria-invalid')).toBe('false')
    fireEvent.blur(campo); expect(campo.getAttribute('aria-invalid')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a Resumen y Emisión →' }))
    await waitFor(() => expect(httpClient.request.mock.calls.some(([ruta]) => ruta === '/api/asesor/condiciones/validacion')).toBe(true))
    expect(httpClient.request.mock.calls.some(([ruta]) => ruta === '/api/asesor/cotizaciones')).toBe(false)
  })

  it('FIX07 envía familia al validador compartido, presenta suma/tope/exceso y bloquea preparación sin cambiar descuento', async () => {
    const original = httpClient.request.getMockImplementation()
    httpClient.request.mockImplementation(async (ruta, opciones) => {
      if (ruta === '/api/asesor/condiciones/validacion') return { errores: opciones.body.condiciones.tramos.length && opciones.body.familia?.titular.estado_civil === 'SOLTERO'
        ? [{ field: 'condiciones.tramos.0.porcentaje_id', message: 'Acumulado 61 %, máximo 55 %, exceso 6 puntos.' }] : [] }
      return original(ruta, opciones)
    })
    montar(<QuoteForm />, '/asesor/nueva?cliente=3')
    fireEvent.change(await screen.findByLabelText('Plan de salud'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar tramo consecutivo' }))
    expect(screen.queryByText('Acumulado 61 %, máximo 55 %, exceso 6 puntos.')).toBeNull()
    fireEvent.change(screen.getByLabelText('Meses tramo 1'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Descuento tramo 1'), { target: { value: '8' } })
    await screen.findByText('Acumulado 61 %, máximo 55 %, exceso 6 puntos.')
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a Resumen y Emisión →' }))
    await waitFor(() => expect(screen.getByLabelText('Descuento tramo 1').getAttribute('aria-invalid')).toBe('true'))
    expect(httpClient.request.mock.calls.some(([ruta]) => ruta === '/api/asesor/cotizaciones')).toBe(false)
    expect(screen.getByLabelText('Descuento tramo 1').value).toBe('8')
    fireEvent.change(screen.getByLabelText('Estado civil'), { target: { value: 'OTRO' } })
    await waitFor(() => expect(screen.queryByText('Acumulado 61 %, máximo 55 %, exceso 6 puntos.')).toBeNull())
    expect(httpClient.request.mock.calls.filter(([ruta]) => ruta === '/api/asesor/condiciones/validacion').at(-1)[1].body.familia.titular.estado_civil).toBe('OTRO')
  })

  it('un tramo nuevo tiene meses vacíos, input sin flechas y no autocompleta al cambiar de esquema', async () => {
    httpClient.request.mockImplementation(async (_ruta, opciones) => ({ errores: opciones.body.condiciones.tramos.flatMap((t, i) => Number.isInteger(t.meses) && t.meses > 0 ? [] : [{ field: `condiciones.tramos.${i}.meses`, message: 'Ingrese meses enteros positivos.' }]) }))
    render(<CampanaValidable inicial={{ ...entrada.condiciones, esquema: 'TRAMOS', tramos: [] }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Agregar tramo consecutivo' }))
    const meses = screen.getByLabelText('Meses tramo 1')
    expect(meses.value).toBe(''); expect(meses.type).toBe('text'); expect(meses.inputMode).toBe('numeric')
    expect(screen.queryByRole('spinbutton')).toBeNull()
    await waitFor(() => expect(screen.queryByText('Verificando política vigente…')).toBeNull())
    expect(meses.getAttribute('aria-invalid')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: /Descuento fijo/ }))
    expect(meses.value).toBe('')
    fireEvent.change(meses, { target: { value: '0' } })
    await screen.findByText('Ingrese meses enteros positivos.')
    fireEvent.change(meses, { target: { value: '3' } })
    await waitFor(() => expect(meses.getAttribute('aria-invalid')).toBe('false'))
    fireEvent.click(screen.getByRole('button', { name: 'Descuento por tramos' }))
    expect(meses.value).toBe('3')
    fireEvent.click(screen.getByRole('button', { name: 'Agregar tramo consecutivo' }))
    expect(screen.getByLabelText('Meses tramo 2').value).toBe('')
    expect(screen.getByLabelText('Meses tramo 1').value).toBe('3')
  })

  it('solo confirma tras respuesta de emisión, bloquea doble clic y relee sin POST al recargar la ruta', async () => {
    const resultado = { precio_base: '100000.00', total: '76108.00', beneficios: [], aportes: [], impuestos: [], tramos: [{ desde_mes: 1, hasta_mes: 3, porcentaje_comercial: '0.00' }], advertencias: [] }
    const emitida = { id: '10', numero: 'MAT-10', estado: 'EMITIDA', revision: 1, solicitud: { cliente, plan: { nombre: 'RUBÍ' }, entrada }, resultado, contacto: {}, eventos: [], recotizaciones: [] }
    const original = httpClient.request.getMockImplementation()
    let resolver
    httpClient.request.mockImplementation(async (ruta, opciones) => {
      if (ruta === '/api/asesor/cotizaciones') return { id: '10', revision: 0 }
      if (ruta === '/api/asesor/cotizaciones/10/calculo') return { resultado, revision: 0, huella: 'a'.repeat(64) }
      if (ruta === '/api/asesor/cotizaciones/10/emision') return new Promise(resolve => { resolver = resolve })
      if (ruta === '/api/asesor/cotizaciones/10') return emitida
      return original(ruta, opciones)
    })
    const router = createMemoryRouter([{ path: '/asesor/nueva', element: <QuoteForm /> }, { path: '/asesor/cotizaciones/:id', element: <QuoteDetail /> }], { initialEntries: ['/asesor/nueva?cliente=3'] })
    render(<RouterProvider router={router} />)
    fireEvent.change(await screen.findByLabelText('Plan de salud'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a Resumen y Emisión →' }))
    const confirmar = await screen.findByRole('button', { name: 'Confirmar y Generar Cotización →' })
    fireEvent.click(confirmar); fireEvent.click(confirmar)
    await waitFor(() => expect(resolver).toBeTypeOf('function'))
    expect(screen.queryByRole('dialog', { name: '¡Cotización generada con éxito!' })).toBeNull()
    await act(async () => resolver(emitida))
    await screen.findByRole('heading', { name: '¡Cotización generada con éxito!' })
    expect(screen.getByText('# MAT-10')).toBeTruthy()
    expect(screen.getByText('$ 76.108,00 / mes')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Descargar PDF Oficial' }).getAttribute('href').endsWith('/api/asesor/cotizaciones/10/pdf')).toBe(true)
    expect(router.state.location.pathname).toBe('/asesor/cotizaciones/10')
    expect(router.state.location.state.cotizacionConfirmada).toBe(true)
    expect(httpClient.request.mock.calls.filter(([ruta]) => ruta.endsWith('/emision'))).toHaveLength(1)
    cleanup()
    const recargado = createMemoryRouter([{ path: '/asesor/cotizaciones/:id', element: <QuoteDetail /> }], { initialEntries: [{ pathname: '/asesor/cotizaciones/10', state: { cotizacionConfirmada: true } }] })
    render(<RouterProvider router={recargado} />)
    await screen.findByRole('heading', { name: '¡Cotización generada con éxito!' })
    expect(httpClient.request.mock.calls.filter(([ruta]) => ruta.endsWith('/emision'))).toHaveLength(1)
  })

  it('detalle compacto conserva economía, familia secundaria y oculta acciones de una anulada', async () => {
    const q = { id: '6', numero: 'MAT-6', estado: 'ANULADA', revision: 2, contacto: {}, solicitud: { cliente, plan: { nombre: 'DIAMANTE' }, entrada }, resultado: { precio_base: '1198928.47', total: '707627.51', tramos: [{ desde_mes: 1, hasta_mes: 3, porcentaje_comercial: '35.00' }], beneficios: [], aportes: [], advertencias: [] }, eventos: [], recotizaciones: [] }
    httpClient.request.mockResolvedValue(q)
    montar(<QuoteDetail />, '/asesor/cotizaciones/6')
    await screen.findByRole('heading', { name: 'MAT-6' })
    expect(document.querySelector('.ase-economics--detail .ase-economic-breakdown')).toBeTruthy()
    expect(document.querySelector('.ase-economics--detail .ase-economic-feature')).toBeTruthy()
    expect(screen.getByText('$ 707.627,51')).toBeTruthy()
    expect(screen.getByText(/Grupo familiar · 1 integrantes/).closest('details').open).toBe(false)
    for (const nombre of ['Editar correo y teléfono', 'Recotizar', 'Anular cotización']) expect(screen.queryByRole('button', { name: nombre })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Descargar PDF Oficial' })).toBeNull()
  })

  it('un porcentaje intacto no muestra errores al agregar ni abandonar; avanzar sí los revela', async () => {
    const original = httpClient.request.getMockImplementation()
    httpClient.request.mockImplementation(async (ruta, opciones) => ruta === '/api/asesor/condiciones/validacion'
      ? { errores: [{ field: 'condiciones.tramos.0.porcentaje_id', message: 'Seleccione un porcentaje publicado.' }] } : original(ruta, opciones))
    montar(<QuoteForm />, '/asesor/nueva?cliente=3')
    fireEvent.change(await screen.findByLabelText('Plan de salud'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar tramo consecutivo' }))
    const porcentaje = screen.getByLabelText('Descuento tramo 1')
    await waitFor(() => expect(screen.queryByText('Verificando política vigente…')).toBeNull())
    expect(porcentaje.getAttribute('aria-invalid')).toBe('false')
    expect(screen.queryByText('Seleccione un porcentaje publicado.')).toBeNull()
    const anteriores = httpClient.request.mock.calls.length
    fireEvent.blur(porcentaje)
    expect(httpClient.request).toHaveBeenCalledTimes(anteriores)
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a Resumen y Emisión →' }))
    await screen.findByText('Seleccione un porcentaje publicado.')
    expect(porcentaje.getAttribute('aria-invalid')).toBe('true')
  })

  it('anulación exige motivo y confirmación, y recotización abre un diálogo sin mutar el original', async () => {
    const q = { id: '1', revision: 2, estado: 'EMITIDA', numero: 'MAT-1', contacto: {}, solicitud: { cliente, plan: { nombre: 'RUBÍ' }, entrada }, eventos: [], recotizaciones: [] }
    httpClient.request.mockResolvedValue(q)
    montar(<QuoteDetail />, '/asesor/cotizaciones/1')
    fireEvent.click(await screen.findByRole('button', { name: 'Recotizar' }))
    expect(screen.getByRole('dialog', { name: 'Preparar recotización' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Continuar a recotización' }).getAttribute('href')).toBe('/asesor/cotizaciones/1/recotizar')
    expect(httpClient.request).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Anular cotización' }))
    const confirmar = screen.getByRole('button', { name: 'Confirmar anulación' })
    expect(confirmar.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Motivo de anulación'), { target: { value: 'Solicitud del titular' } })
    expect(confirmar.disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Confirmo que deseo anular esta cotización.' }))
    expect(confirmar.disabled).toBe(false)
    httpClient.request.mockRejectedValueOnce(new Error('No guardar: prueba de contrato'))
    fireEvent.click(confirmar)
    await screen.findByText('No guardar: prueba de contrato')
    expect(httpClient.request.mock.calls.at(-1)[1].body).toEqual({ revision: 2, motivo: 'Solicitud del titular' })
  })

  it('familia ofrece solo vínculos reales y no reinterpreta un adherente histórico al cargarlo', () => {
    const cambiar = vi.fn()
    const historica = { ...familia, miembros: [{ parentesco: 'ADHERENTE', edad: 12 }] }
    render(<FamilyGroupEditor value={historica} onChange={cambiar} />)
    const vinculo = screen.getByRole('combobox', { name: 'Parentesco 1' })
    expect([...vinculo.options].map(o => o.value)).toEqual(['', 'CONYUGE', 'HIJO'])
    expect(vinculo.value).toBe(''); expect(vinculo.checkValidity()).toBe(false)
    expect(cambiar).not.toHaveBeenCalled()
    fireEvent.change(vinculo, { target: { value: 'HIJO' } })
    expect(cambiar).toHaveBeenCalledWith({ ...historica, miembros: [{ parentesco: 'HIJO', edad: 12 }] })
    expect(historica.miembros[0].parentesco).toBe('ADHERENTE')
  })

  it('cantidad registrada es exclusiva de Monotributo, acepta cero y no depende de familiares', async () => {
    montar(<QuoteForm />, '/asesor/nueva?cliente=3')
    await screen.findByLabelText('Plan de salud')
    const etiqueta = 'Cantidad de adherentes registrados en Monotributo'
    expect(screen.queryByLabelText(etiqueta)).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: 'Monotributo' }))
    const cantidad = screen.getByLabelText(etiqueta)
    expect(cantidad.value).toBe('0'); expect(cantidad.checkValidity()).toBe(true)
    fireEvent.change(cantidad, { target: { value: '31' } })
    expect(cantidad.checkValidity()).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Agregar integrante' }))
    expect(cantidad.value).toBe('31')
    expect(screen.queryByRole('option', { name: 'Adherente' })).toBeNull()
    fireEvent.change(cantidad, { target: { value: '' } })
    expect(cantidad.value).toBe(''); expect(cantidad.checkValidity()).toBe(false)
    fireEvent.change(cantidad, { target: { value: '-1' } }); expect(cantidad.checkValidity()).toBe(false)
    fireEvent.change(cantidad, { target: { value: '1.5' } }); expect(cantidad.checkValidity()).toBe(false)
    fireEvent.click(screen.getByRole('radio', { name: 'Obligatorio' }))
    expect(screen.queryByLabelText(etiqueta)).toBeNull()
    fireEvent.click(screen.getByRole('radio', { name: 'Voluntario' }))
    expect(screen.queryByLabelText(etiqueta)).toBeNull()
  })

  it('recotización conserva cantidad declarada sin modificar ni sobrescribir el registro origen', async () => {
    const datos = { ...entrada, modalidad: 'Monotributo', aportes: { categoria: 'A', adherentes: 2 } }
    const origen = { id: '10', cliente_id: '3', revision: 2, solicitud: { cliente, entrada: datos, plan: { nombre: 'RUBÍ' } } }
    const antes = JSON.stringify(origen), original = httpClient.request.getMockImplementation()
    httpClient.request.mockImplementation(async (ruta, opciones) => {
      if (ruta === '/api/asesor/cotizaciones/10') return origen
      if (ruta === '/api/asesor/cotizaciones/10/recotizaciones') return { id: '11', revision: 0 }
      if (ruta === '/api/asesor/cotizaciones/11/calculo') return { resultado: { precio_base: '100.00', total: '0.00', tramos: [{ desde_mes: 1, hasta_mes: 1 }], beneficios: [], aportes: [], advertencias: [] } }
      return original(ruta, opciones)
    })
    const router = createMemoryRouter([{ path: '/asesor/cotizaciones/:id/recotizar', element: <QuoteForm recotizar /> }], { initialEntries: ['/asesor/cotizaciones/10/recotizar'] })
    render(<RouterProvider router={router} />)
    expect((await screen.findByLabelText('Cantidad de adherentes registrados en Monotributo')).value).toBe('2')
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a Resumen y Emisión →' }))
    await screen.findByText('Total Inicial Estimado (1° Tramo)')
    const llamada = httpClient.request.mock.calls.find(([ruta]) => ruta === '/api/asesor/cotizaciones/10/recotizaciones')
    expect(llamada[1].body.aportes).toEqual({ categoria: 'A', adherentes: 2 })
    expect(llamada[1].method).toBe('POST'); expect(JSON.stringify(origen)).toBe(antes)
    expect(httpClient.request.mock.calls.some(([ruta, opciones]) => ruta === '/api/asesor/cotizaciones/10' && opciones?.method === 'PUT')).toBe(false)
  })

  it('preview, detalle e historial presentan el total y ambos aportes recibidos sin fórmulas locales', async () => {
    const resultado = { precio_base: '1198928.47', total: '707627.51', tramos: [{ desde_mes: 1, hasta_mes: 3, porcentaje_comercial: '35.00' }], beneficios: [{ concepto: 'Comercial', porcentaje: '35.00', importe: '419624.96' }],
      aportes: [{ concepto: 'Monotributo (titular)', importe: '23892.00' }, { concepto: 'Adherentes Monotributo', importe: '47784.00' }], advertencias: [] }
    httpClient.request.mockResolvedValue({ resultado })
    render(<EconomicPreview entrada={{ ...entrada, modalidad: 'Monotributo', aportes: { categoria: 'A', adherentes: 2 } }} />)
    await screen.findByText('$ 707.627,51')
    expect(screen.getByText('Aporte Monotributo (titular)')).toBeTruthy()
    expect(screen.getByText('Aporte Adherentes Monotributo')).toBeTruthy()
    expect(screen.getByText(/47\.784,00/)).toBeTruthy()
    cleanup()
    render(<QuoteReview solicitud={{ cliente, entrada: { ...entrada, modalidad: 'Monotributo' }, plan: { nombre: 'DIAMANTE' } }} resultado={resultado} />)
    expect(screen.getByText('$ 707.627,51')).toBeTruthy()
    expect(screen.getByText('Aporte Monotributo (titular)')).toBeTruthy()
    cleanup()
    httpClient.request.mockImplementation(async ruta => ruta === '/api/catalogo/planes' ? { planes: [] } : { cotizaciones: [{ id: '1', numero: 'MAT-1', created_at: '2026-10-24T12:00:00Z', nombres: 'Titular', apellidos: 'Prueba', plan_nombre: 'DIAMANTE', modalidad: 'Monotributo', estado: 'EMITIDA', total: resultado.total, aportes: resultado.aportes }] })
    montar(<QuoteHistory />)
    await screen.findByText(/707\.627,51/)
    expect(screen.getByText(/Aporte Monotributo \(titular\):/)).toBeTruthy()
    expect(screen.getByText(/Aporte Adherentes Monotributo:/)).toBeTruthy()
  })

  it('meses se validan al editar, blur confirma y corregir retira el mensaje inmediatamente', async () => {
    httpClient.request.mockImplementation(async (_ruta, opciones) => ({ errores: opciones.body.condiciones.tramos[0]?.meses > 12
      ? [{ field: 'condiciones.tramos.0.meses', message: 'La duración acumulada supera el máximo de 12 meses.' }] : [] }))
    render(<CampanaValidable />)
    const meses = screen.getByLabelText('Meses tramo 1')
    fireEvent.change(meses, { target: { value: '13' } })
    expect(httpClient.request).toHaveBeenCalledTimes(1)
    await screen.findByText('La duración acumulada supera el máximo de 12 meses.')
    expect(meses.getAttribute('aria-invalid')).toBe('true')
    expect(meses.closest('.ase-discounts').classList.contains('ase-section-invalid')).toBe(true)
    fireEvent.change(meses, { target: { value: '3' } })
    expect(meses.getAttribute('aria-invalid')).toBe('false')
    fireEvent.blur(meses)
    await waitFor(() => expect(meses.getAttribute('aria-invalid')).toBe('false'))
    fireEvent.click(screen.getByRole('checkbox', { name: /TDC/ }))
    await waitFor(() => expect(httpClient.request).toHaveBeenCalledTimes(4))
    fireEvent.click(screen.getByRole('button', { name: 'Quitar tramo 1' }))
    await waitFor(() => expect(httpClient.request).toHaveBeenCalledTimes(5))
  })

  it('rechazo comercial bloquea avance y enfoca el primer campo inválido', async () => {
    const original = httpClient.request.getMockImplementation()
    httpClient.request.mockImplementation(async (ruta, opciones) => ruta === '/api/asesor/condiciones/validacion'
      ? { errores: [{ field: 'condiciones.tramos.0.meses', message: 'Duración fuera de la política vigente.' }] } : original(ruta, opciones))
    montar(<QuoteForm />, '/asesor/nueva?cliente=3')
    fireEvent.change(await screen.findByLabelText('Plan de salud'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Edad del titular'), { target: { value: '35' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar tramo consecutivo' }))
    fireEvent.change(screen.getByLabelText('Descuento tramo 1'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a Resumen y Emisión →' }))
    await screen.findByText('Duración fuera de la política vigente.')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Meses tramo 1')))
    expect(httpClient.request.mock.calls.some(([ruta]) => ruta === '/api/asesor/cotizaciones')).toBe(false)
    expect(screen.queryByRole('button', { name: 'Confirmar y Generar Cotización →' })).toBeNull()
  })

  it('dashboard compartido ofrece accesos según rol sin administración para ASESOR', () => {
    render(<SessionContext.Provider value={{ user: { rol: 'ASESOR' } }}><MemoryRouter><ComercialDashboard /></MemoryRouter></SessionContext.Provider>)
    expect(screen.getAllByRole('link')).toHaveLength(5)
    expect(screen.getByRole('link', { name: /Historial/ }).getAttribute('href')).toBe('/asesor/cotizaciones')
    expect(screen.getByRole('link', { name: /Condiciones comerciales/ }).getAttribute('href')).toBe('/asesor/condiciones')
    expect(screen.getByRole('link', { name: /Nueva cotización/ })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Administración/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /^Clientes/ })).toBeNull()
  })

  it('cliente ajeno muestra asesor y fecha, sin formulario editable', async () => {
    httpClient.request.mockResolvedValue({ encontrado: true, autorizado: false, asesor: 'Asesor Referente', registrado_at: '2026-10-23T12:00:00Z' })
    montar(<ClientSearch />)
    fireEvent.change(screen.getByLabelText('DNI'), { target: { value: '12345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar cliente' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Asesor Referente'))
    expect(screen.queryByLabelText('Nombres')).toBeNull()
    expect(httpClient.request).toHaveBeenCalledTimes(1)
  })

  it('alta sin nacimiento entrega edad declarada para cotizar y persiste solo identidad/contacto', async () => {
    httpClient.request.mockResolvedValueOnce({ encontrado: false }).mockResolvedValueOnce(cliente)
    const seleccionar = vi.fn()
    montar(<ClientSearch onSelect={seleccionar} />)
    fireEvent.change(screen.getByLabelText('DNI'), { target: { value: '12345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar cliente' }))
    fireEvent.change(await screen.findByLabelText('Nombres'), { target: { value: 'Titular' } })
    fireEvent.change(screen.getByLabelText('Apellidos'), { target: { value: 'Prueba' } })
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'titular@example.test' } })
    expect(screen.queryByText('Titular y grupo familiar')).toBeNull()
    expect(screen.queryByLabelText('Edad del titular')).toBeNull()
    fireEvent.change(screen.getByLabelText('Edad'), { target: { value: '25' } })
    fireEvent.change(screen.getByLabelText('Provincia'), { target: { value: 'Córdoba' } })
    fireEvent.change(screen.getByLabelText('Localidad'), { target: { value: 'Villa María' } })
    expect(screen.getByLabelText('Edad').readOnly).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente: Configurar Cotización' }))
    await screen.findByText('Cliente guardado.')
    expect(seleccionar).toHaveBeenCalledWith(cliente)
    const body = httpClient.request.mock.calls[1][1].body
    expect(body.fecha_nacimiento).toBeUndefined()
    expect(body.edad_declarada).toBeUndefined()
    expect(body.provincia).toBe('Córdoba'); expect(body.localidad).toBe('Villa María')
    expect(body.familia).toBeUndefined(); expect(body.edad).toBeUndefined()
    expect(body.asesor_legajo).toBeUndefined()
    expect(body.resultado).toBeUndefined()
  })

  it.each(['', 'invalido'])('impide guardar o reutilizar un cliente con correo inválido: %s', async email => {
    const seleccionar = vi.fn()
    montar(<ClientSearch initialCliente={{ ...cliente, email }} onSelect={seleccionar} />)
    const campo = screen.getByLabelText('Correo electrónico')
    expect(campo.required).toBe(true)
    expect(campo.checkValidity()).toBe(false)
    const siguiente = screen.getByRole('button', { name: 'Siguiente: Configurar Cotización' })
    expect(siguiente.disabled).toBe(true)
    fireEvent.click(siguiente)
    fireEvent.submit(campo.form)
    expect(seleccionar).not.toHaveBeenCalled()
    expect(httpClient.request).not.toHaveBeenCalled()
  })

  it('reutiliza un cliente válido y descarta su identidad al cambiar el DNI', () => {
    const seleccionar = vi.fn()
    montar(<ClientSearch initialCliente={cliente} onSelect={seleccionar} />)
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente: Configurar Cotización' }))
    expect(seleccionar).toHaveBeenCalledWith(cliente)
    fireEvent.change(screen.getByLabelText('DNI'), { target: { value: '87654321' } })
    expect(screen.getByLabelText('Correo electrónico').disabled || screen.getByLabelText('Correo electrónico').closest('fieldset').disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Siguiente: Configurar Cotización' }).disabled).toBe(true)
  })

  it('conserva datos personales y familia de la cotización al volver entre pasos', async () => {
    const original = httpClient.request.getMockImplementation()
    const actual = { ...cliente, fecha_nacimiento: '2000-01-01', familia: null }
    httpClient.request.mockImplementation(async (ruta, opciones) => {
      if (ruta === '/api/asesor/clientes/busqueda/12345678') return { encontrado: true, autorizado: true, cliente: actual }
      return original(ruta, opciones)
    })
    montar(<QuoteForm />, '/asesor/nueva')
    fireEvent.change(await screen.findByLabelText('DNI'), { target: { value: '12345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar cliente' }))
    await screen.findByLabelText('Edad')
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar datos' }))
    expect(screen.queryByText('Titular y grupo familiar')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente: Configurar Cotización' }))
    expect((await screen.findByLabelText('Edad del titular')).readOnly).toBe(false)
    fireEvent.change(screen.getByLabelText('Edad del titular'), { target: { value: '41' } })
    fireEvent.change(screen.getByLabelText('Estado civil'), { target: { value: 'CASADO' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar integrante' }))
    fireEvent.change(screen.getByLabelText('Edad integrante 1'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Volver a Datos del Cliente' }))
    expect(screen.getByLabelText('Nombres').value).toBe('Titular')
    expect(screen.queryByLabelText('Fecha de nacimiento')).toBeNull()
    expect(screen.getByLabelText('Edad').value).toBe('41')
    expect(screen.getByLabelText('Correo electrónico').value).toBe(cliente.email)
    expect(screen.queryByLabelText('Edad integrante 1')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente: Configurar Cotización' }))
    expect(screen.getByLabelText('Estado civil').value).toBe('CASADO')
    expect(screen.getByLabelText('Edad integrante 1').value).toBe('5')
    expect(httpClient.request.mock.calls.some(([ruta, opciones]) => opciones?.method === 'POST' && ruta !== '/api/asesor/condiciones/validacion')).toBe(false)
  })

  it('siguiente persiste ediciones personales antes de seleccionar y conserva dirección histórica', async () => {
    const seleccionar = vi.fn()
    const anterior = { ...cliente, direccion: 'Dirección histórica' }
    const actualizado = { ...anterior, nombres: 'Cambio sin guardar', revision: 2 }
    httpClient.request.mockResolvedValueOnce(actualizado)
    montar(<ClientSearch initialCliente={anterior} onSelect={seleccionar} />)
    expect(screen.queryByLabelText('Dirección')).toBeNull()
    fireEvent.change(screen.getByLabelText('Nombres'), { target: { value: 'Cambio sin guardar' } })
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente: Configurar Cotización' }))
    await waitFor(() => expect(seleccionar).toHaveBeenCalledWith(actualizado))
    expect(httpClient.request.mock.calls[0][1].body.direccion).toBe(anterior.direccion)
  })

  it('exige edad declarada en el alta y no presenta ni inventa fechas históricas', async () => {
    httpClient.request.mockResolvedValueOnce({ encontrado: false })
    montar(<ClientSearch />)
    fireEvent.change(screen.getByLabelText('DNI'), { target: { value: '12345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar cliente' }))
    const edad = await screen.findByLabelText('Edad')
    expect(edad.required).toBe(true)
    expect(edad.checkValidity()).toBe(false)
    expect(screen.queryByLabelText('Fecha de nacimiento')).toBeNull()
    cleanup()
    montar(<ClientSearch initialCliente={cliente} />)
    expect(screen.getByLabelText('Edad').value).toBe('25')
    expect(screen.queryByLabelText('Fecha de nacimiento')).toBeNull()
  })

  it('prepara modalidad y tramos, presenta cálculo del servidor y confirma solo revisión/huella', async () => {
    const resultado = { precio_base: '100000.00', total: '76108.00', aportes: [{ concepto: 'Monotributo', importe: '23892.00' }], beneficios: [], impuestos: [], tramos: [{ desde_mes: 1, hasta_mes: 3, porcentaje_comercial: '30.00', total: '76108.00' }], advertencias: [] }
    const original = httpClient.request.getMockImplementation()
    httpClient.request.mockImplementation(async (ruta, opciones) => {
      if (ruta === '/api/asesor/cotizaciones') return { id: '10', revision: 0 }
      if (ruta === '/api/asesor/cotizaciones/10/calculo') return { resultado, revision: 0, huella: 'a'.repeat(64) }
      if (ruta === '/api/asesor/cotizaciones/10/emision') throw new Error('Confirmación capturada por la prueba')
      return original(ruta, opciones)
    })
    montar(<QuoteForm />, '/asesor/nueva?cliente=3')
    fireEvent.change(await screen.findByLabelText('Plan de salud'), { target: { value: '1' } })
    // Cliente histórico sin fecha: la edad se declara únicamente para esta preparación.
    fireEvent.change(screen.getByLabelText('Edad del titular'), { target: { value: '25' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Monotributo' }))
    fireEvent.change(screen.getByLabelText('Categoría de Monotributo'), { target: { value: 'A' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar tramo consecutivo' }))
    fireEvent.change(screen.getByLabelText('Descuento tramo 1'), { target: { value: '8' } })
    fireEvent.change(screen.getByLabelText('Meses tramo 1'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a Resumen y Emisión →' }))
    await screen.findByText('Total Inicial Estimado (1° Tramo)')
    expect(screen.getAllByText('$ 76.108,00').length).toBeGreaterThan(0)
    const body = httpClient.request.mock.calls.find(([ruta]) => ruta === '/api/asesor/cotizaciones')[1].body
    expect(body.modalidad).toBe('Monotributo')
    expect(body.condiciones.tramos).toEqual([{ porcentaje_id: '8', meses: 3 }])
    expect(body.aportes).toEqual({ categoria: 'A', adherentes: 0 })
    expect(body.total).toBeUndefined(); expect(body.resultado).toBeUndefined()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y Generar Cotización →' }))
    await screen.findByText('Confirmación capturada por la prueba')
    expect(httpClient.request.mock.calls.at(-1)[1].body).toEqual({ revision: 0, huella: 'a'.repeat(64) })
  })

  it('listas muestran datos reales y únicamente acciones Imprimir y Exportar PDF', async () => {
    httpClient.request.mockImplementation(async ruta => ruta === '/api/catalogo/planes' ? { planes: [{ id: 1, nombre: 'RUBÍ' }] } :
      { plan: { id: 1, nombre: 'RUBÍ' }, tipo_ingreso: 'Voluntario', version: { id: '9', fecha_activacion: '2026-10-23T00:00:00Z' }, tarifas: [{ rango_clave: '0-25', rango_etario: '0 a 25 años', precio: '123.45' }] })
    montar(<ListasPage />)
    await screen.findByText(/123,45/)
    expect(screen.getByRole('combobox', { name: 'Seleccionar Plan de Salud' })).toBeTruthy()
    expect(screen.getByRole('searchbox', { name: 'Filtrar Segmento o Edad' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Imprimir' }).getAttribute('href').endsWith('/api/catalogo/listas/1/Voluntario/impresion')).toBe(true)
    expect(screen.getByRole('link', { name: 'Exportar PDF' }).getAttribute('href').endsWith('/api/catalogo/listas/1/Voluntario/pdf')).toBe(true)
    expect(screen.queryByRole('link', { name: 'Exportar CSV' })).toBeNull()
  })

  it('vista previa descarta importes anteriores inmediatamente y no persiste borradores', async () => {
    const resultado = { precio_base: '123.00', total: '100.00', tramos: [{ desde_mes: 1, hasta_mes: 1, porcentaje_comercial: '0' }], beneficios: [], aportes: [], advertencias: [] }
    let resolver
    httpClient.request.mockResolvedValueOnce({ resultado }).mockImplementationOnce(() => new Promise(resolve => { resolver = resolve }))
    const { rerender } = render(<EconomicPreview entrada={entrada} />)
    await screen.findByText('$ 100,00')
    rerender(<EconomicPreview entrada={{ ...entrada, plan_id: '2' }} />)
    expect(screen.queryByText('$ 100,00')).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('Calculando')
    await waitFor(() => expect(resolver).toBeTypeOf('function'))
    resolver({ resultado: { ...resultado, total: '200.00' } })
    await screen.findByText('$ 200,00')
    expect(httpClient.request.mock.calls.every(([ruta]) => ruta === '/api/asesor/cotizaciones/previsualizacion')).toBe(true)
  })

  it('resumen distingue condiciones futuras y omite beneficios de cero sin repetir importes por tramo', () => {
    render(<QuoteSummary resultado={{ precio_base: '123.00', total: '100.00', tramos: [{ desde_mes: 1, hasta_mes: 3, porcentaje_comercial: '10', total: '100.00' }, { desde_mes: 4, hasta_mes: 6, porcentaje_comercial: '5', total: '110.00' }], beneficios: [{ concepto: 'TDC', porcentaje: '0', importe: '0.00' }], aportes: [], advertencias: [] }} />)
    expect(screen.queryByText(/Descuento TDC/)).toBeNull()
    expect(screen.queryByText('$ 110,00')).toBeNull()
    expect(screen.getByText('Condición futura pactada')).toBeTruthy()
    expect(screen.getByText('Meses 4 a 6')).toBeTruthy()
  })

  it('adicionales muestran solo porcentajes positivos habilitados y conservan el contrato de TDC', () => {
    const cambiar = vi.fn()
    render(<DiscountSelector value={{ ...entrada.condiciones, esquema: 'TRAMOS' }} onChange={cambiar} politica={{ ...politica, afinidad_pct: '0.00' }} />)
    expect(screen.queryByLabelText(/Aplicar afinidad/)).toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: /Solicitar beneficio TDC/ }))
    expect(cambiar).toHaveBeenCalledWith({ ...entrada.condiciones, esquema: 'TRAMOS', tdc: true })
    expect(screen.getByRole('button', { name: 'Agregar tramo consecutivo' }).disabled).toBe(false)
  })

  it('un descuento futuro no se presenta como activo aunque el primer período no tenga descuento', () => {
    render(<QuoteSummary resultado={{ precio_base: '100.00', total: '100.00', tramos: [{ desde_mes: 1, hasta_mes: 3, porcentaje_comercial: '0' }, { desde_mes: 4, hasta_mes: 6, porcentaje_comercial: '10' }], beneficios: [], aportes: [], advertencias: [] }} />)
    expect(screen.queryByText('Tramo activo inicial')).toBeNull()
    expect(screen.getByText('Condición futura pactada')).toBeTruthy()
  })

  it('historial usa totales persistidos y filtros de plan/cliente reales', async () => {
    const original = httpClient.request.getMockImplementation()
    httpClient.request.mockImplementation(async (ruta, opciones) => ruta.startsWith('/api/asesor/cotizaciones?') ? { cotizaciones: [{ id: '1', numero: 'MAT-1', created_at: '2026-10-24T12:00:00Z', nombres: 'Titular', apellidos: 'Prueba', dni: '12345678', plan_nombre: 'RUBÍ', estado: 'EMITIDA', modalidad: 'Voluntario', total: '150.00' }] } : original(ruta, opciones))
    montar(<QuoteHistory />)
    await screen.findByText('$ 150,00')
    fireEvent.change(screen.getByLabelText('Plan'), { target: { value: '1' } })
    await waitFor(() => expect(httpClient.request.mock.calls.some(([ruta]) => ruta.includes('plan=1'))).toBe(true))
    expect(screen.getByRole('link', { name: 'Descargar PDF' })).toBeTruthy()
  })

  it('detalle preserva contacto separado y permite continuar cálculo sin PDF de borrador', async () => {
    const q = { id: '1', revision: 2, estado: 'BORRADOR', contacto: { email: 'a@example.test' }, solicitud: { cliente, plan: { nombre: 'RUBÍ' }, entrada }, eventos: [], recotizaciones: [] }
    httpClient.request.mockResolvedValue(q)
    montar(<QuoteDetail />, '/asesor/cotizaciones/1')
    await screen.findByRole('heading', { name: 'Preparación #1' })
    expect(screen.queryByRole('link', { name: /Descargar PDF/ })).toBeNull()
    expect(screen.getByRole('link', { name: 'Calcular y emitir' }).getAttribute('href')).toBe('/asesor/cotizaciones/1/preparacion')
    httpClient.request.mockRejectedValueOnce(new Error('Prueba: no guardar'))
    fireEvent.click(screen.getByRole('button', { name: 'Editar correo y teléfono' }))
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'nuevo@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contacto' }))
    await waitFor(() => expect(httpClient.request.mock.calls.at(-1)[1].method).toBe('PATCH'))
    expect(Object.keys(httpClient.request.mock.calls.at(-1)[1].body).sort()).toEqual(['contacto', 'revision'])
  })
})


/** SPEC-28 · validación telefónica compartida por Nueva cotización y Recotizar. */
describe('SPEC-28 validación del teléfono', () => {
  /** Completa alta con el teléfono indicado; los demás datos quedan válidos. */
  async function altaConTelefono(valor) {
    const seleccionar = vi.fn()
    httpClient.request.mockReset()
    httpClient.request.mockImplementationOnce(async () => ({ encontrado: false }))
      .mockImplementationOnce(async (_ruta, opciones) => ({ ...opciones.body, id: '4', revision: 0 }))
    montar(<ClientSearch onSelect={seleccionar} />)
    fireEvent.change(screen.getByLabelText('DNI'), { target: { value: '12345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar cliente' }))
    await screen.findByLabelText('Nombres')
    for (const [campo, v] of [['Nombres', 'María'], ['Apellidos', 'Pérez'], ['Correo electrónico', 'Maria@example.test'], ['Edad', '25']]) {
      fireEvent.change(screen.getByLabelText(campo), { target: { value: v } })
    }
    if (valor !== null) {
      fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: valor } })
      fireEvent.blur(screen.getByLabelText('Teléfono'))
    }
    return seleccionar
  }

  it('avanza con el teléfono vacío: sigue siendo opcional', async () => {
    const seleccionar = await altaConTelefono(null)
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente: Configurar Cotización' }))
    await waitFor(() => expect(seleccionar).toHaveBeenCalled())
    expect(screen.queryByText(/inválido: use dígitos/i)).toBeNull()
  })

  it('rechaza letras con el mensaje junto al campo y bloquea el avance', async () => {
    const seleccionar = await altaConTelefono('aaaa')
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente: Configurar Cotización' }))
    expect(screen.getByText(/inválido: use dígitos/i)).toBeTruthy()
    expect(seleccionar).not.toHaveBeenCalled()
    // Con el valor corregido vuelve a habilitar el avance.
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '+54 11 3334-4444' } })
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente: Configurar Cotización' }))
    await waitFor(() => expect(seleccionar).toHaveBeenCalled())
  })

  it('rechaza combinaciones con letras intercaladas y dígitos insuficientes', async () => {
    for (const invalido of ['11abc444', '12345']) {
      cleanup()
      await altaConTelefono(invalido)
      expect(screen.getByRole('button', { name: 'Siguiente: Configurar Cotización' }).disabled).toBe(true)
      expect(screen.getByText(/inválido: use dígitos/i)).toBeTruthy()
    }
  })

  it('el contacto de una preparación/recotización aplica la misma validación en el detalle', async () => {
    const preparacion = {
      id: '1', revision: 0, estado: 'BORRADOR', numero: null, resultado: null,
      recotizaciones: [], eventos: [], origen_id: null,
      contacto: { email: 'titular@example.test', telefono: 'aaaa' },
      solicitud: { cliente: { nombres: 'David', apellidos: 'Diaz' }, plan: { nombre: 'RUBÍ' }, referencias: {}, entrada: { plan_id: '1', modalidad: 'Voluntario', familia: { titular: { edad: 25, estado_civil: 'SOLTERO' }, miembros: [] }, aportes: {}, condiciones: { esquema: 'FIJO', tramos: [], tdc: false, beneficios: { solicita_afinidad: false } } } },
    }
    httpClient.request.mockReset()
    httpClient.request.mockImplementation(async ruta => {
      if (ruta.startsWith('/api/asesor/cotizaciones/')) return preparacion
      throw new Error('Ruta no prevista')
    })
    montar(<QuoteDetail />, '/asesor/cotizaciones/1')
    await screen.findByRole('heading', { name: 'Detalle de Cotización' })
    fireEvent.click(screen.getByRole('button', { name: 'Editar correo y teléfono' }))
    const telefono = screen.getByLabelText('Teléfono')
    // El valor histórico se presenta tal cual; se corrige al guardar.
    expect(telefono.value).toBe('aaaa')
    fireEvent.change(telefono, { target: { value: '+54 000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contacto' }))
    expect(screen.getByText(/inválido: use dígitos/i)).toBeTruthy()
    expect(httpClient.request.mock.calls.some(([ruta, o]) => ruta.endsWith('/contacto') && o?.method === 'PATCH')).toBe(false)
    fireEvent.change(telefono, { target: { value: '1133344444' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar contacto' }))
    await waitFor(() => expect(httpClient.request).toHaveBeenCalledWith('/api/asesor/cotizaciones/1/contacto', expect.objectContaining({ method: 'PATCH' })))
  })
})

/** SPEC-28 · scroll entre pasos y orden de las secciones del paso 2. */
describe('SPEC-28 navegación entre pasos', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    httpClient.request.mockImplementation(async (ruta) => {
      if (ruta === '/api/asesor/condiciones/validacion') return { errores: [] }
      if (ruta === '/api/catalogo/planes') return { planes: [{ id: 1, nombre: 'RUBÍ' }] }
      if (ruta === '/api/catalogo/condiciones') return { politica, categorias_monotributo: ['A'], motor_disponible: true }
      if (ruta === '/api/asesor/clientes/3') return cliente
      throw new Error('Ruta no prevista')
    })
  })

  /** Alta de cliente (paso 2 → 1 → 2) para ejercitar el cambio de paso. */
  async function prepararDesdePaso2() {
    montar(<QuoteForm />, '/asesor/nueva?cliente=3')
    await screen.findByText('Plan de Salud')
    fireEvent.click(screen.getByRole('button', { name: 'Volver a Datos del Cliente' }))
    await screen.findByLabelText('Teléfono')
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente: Configurar Cotización' }))
    await screen.findByText('Plan de Salud')
  }

  it('al cambiar de paso el foco queda en el indicador de progreso (ancla del reposicionamiento)', async () => {
    await prepararDesdePaso2()
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Progreso de la cotización')
  })

  it('el paso 2 presenta una única vista previa con el orden familiar → descuentos → vista previa', async () => {
    await prepararDesdePaso2()
    const fieldset = document.querySelector('fieldset.ase-operation')
    const hijos = [...fieldset.children].map(n => n.getAttribute('data-section') ?? n.className)
    expect(screen.getAllByText('Vista Previa Económica')).toHaveLength(1)
    const indiceFamilia = hijos.findIndex(c => c === 'familia' || c.includes('ase-family'))
    const indiceDescuentos = hijos.findIndex(c => c.includes('ase-config-descuentos'))
    const indicePreview = hijos.findIndex(c => c.includes('ase-preview'))
    expect(indiceFamilia).toBeGreaterThan(0)
    expect(indiceDescuentos).toBeGreaterThan(indiceFamilia)
    expect(indicePreview).toBeGreaterThan(indiceDescuentos)
  })

  it('conserva los datos al retroceder del paso 3 al 2 sin reconsultar el catálogo', async () => {
    httpClient.request.mockImplementation(async (ruta) => {
      if (ruta === '/api/asesor/condiciones/validacion') return { errores: [] }
      if (ruta === '/api/catalogo/planes') return { planes: [{ id: 1, nombre: 'RUBÍ' }] }
      if (ruta === '/api/catalogo/condiciones') return { politica, categorias_monotributo: ['A'], motor_disponible: true }
      if (ruta === '/api/asesor/clientes/3') return cliente
      if (ruta === '/api/asesor/cotizaciones') return { id: '10', revision: 0 }
      if (ruta === '/api/asesor/cotizaciones/10/calculo') return { revision: 0, huella: 'h'.repeat(64), resultado: { precio_base: '100.00', total: '100.00', tramos: [{ desde_mes: 1, hasta_mes: 12, porcentaje_comercial: '0', total: '100.00' }], beneficios: [], aportes: [], impuestos: [], advertencias: [] } }
      throw new Error('Ruta no prevista')
    })
    montar(<QuoteForm />, '/asesor/nueva?cliente=3')
    await screen.findByText('Plan de Salud')
    fireEvent.change(screen.getByLabelText('Plan de salud'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Monotributo' }))
    fireEvent.change(screen.getByLabelText('Categoría de Monotributo'), { target: { value: 'A' } })
    const consultasCatalogo = httpClient.request.mock.calls.filter(([ruta]) => ruta.includes('catalogo')).length
    fireEvent.click(screen.getByRole('button', { name: 'Continuar a Resumen y Emisión →' }))
    await screen.findByText('Previsualización de Cotización')
    fireEvent.click(screen.getByRole('button', { name: 'Volver a Configurar Cotización' }))
    await screen.findByText('Plan de Salud')
    expect(screen.getByLabelText('Categoría de Monotributo').value).toBe('A')
    expect(screen.getByLabelText('Plan de salud').value).toBe('1')
    expect(httpClient.request.mock.calls.filter(([ruta]) => ruta.includes('catalogo')).length).toBe(consultasCatalogo)
  })
})
