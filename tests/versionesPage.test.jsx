import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { SessionContext } from '../src/features/auth/context/SessionContext.js'
import { VersionesPage } from '../src/features/admin/pages/VersionesPage.jsx'
import { adminApi } from '../src/features/admin/api/adminApi.js'
import { ApiError } from '../src/shared/lib/httpClient.js'

vi.mock('../src/features/admin/api/adminApi.js', () => ({
  adminApi: {
    listarVersiones: vi.fn(),
    obtenerVersion: vi.fn(),
    listarTarifasVersion: vi.fn(),
    obtenerEventosVersion: vi.fn(),
    crearBorradorTarifario: vi.fn(),
    recuperarVersionHistorica: vi.fn(),
    aumentarVersion: vi.fn(),
    editarPrecioTarifa: vi.fn(),
    finalizarVersion: vi.fn(),
    activarVersion: vi.fn(),
    reanudarVersion: vi.fn(),
    deshacerUltimoCambio: vi.fn(),
    descartarVersion: vi.fn(),
  },
}))

/** Contexto de sesión mínimo para el manejo de sesiones vencidas de ADMIN. */
const SESION = {
  status: 'AUTHENTICATED',
  user: { legajo: '0000000002', rol: 'ADMIN' },
  refreshSession: vi.fn(),
}

  /**
   * Lee los numeros de version de la PRIMERA columna de cada fila de
   * datos (ignorando encabezados y la columna Base) y descarta la marca
   * Vigente que puede acompañar al numero de la version activa.
   * @returns {Promise<string[]>} Numeros de version en orden de pantalla.
   */
  async function leerColumnaVersiones() {
    const filas = await screen.findAllByRole('row')
    return filas
      .map((fila) => fila.querySelector('td'))
      .filter((celda) => celda !== null)
      .map((celda) => celda.textContent.replace(/Vigente$/, '').trim())
  }

/** Captura la ubicación para verificar los enlaces profundos del ciclo. */
function RutaEspia() {
  const location = useLocation()
  return <aside data-testid="ubicacion">{location.search}</aside>
}

/** Renderiza la pantalla con la búsqueda inicial y un espía de navegación. */
function renderPantalla(busqueda = '') {
  return render(
    <MemoryRouter initialEntries={[`/admin/versiones${busqueda}`]}>
      <SessionContext.Provider value={{ ...SESION, clearSession: vi.fn() }}>
        <Routes>
          <Route
            path="/admin/versiones"
            element={(
              <>
                <VersionesPage />
                <RutaEspia />
              </>
            )}
          />
        </Routes>
      </SessionContext.Provider>
    </MemoryRouter>,
  )
}

/** Historial sintético con la ACTIVA inicial, un borrador en PREPARACION y la vieja ACTIVA ya HISTORICA. */
function historial() {
  return {
    versiones: [
      {
        id: '7', tipo: 'EDICION_LISTA', estado: 'PREPARACION', revision: 1,
        fecha_activacion: null, version_base_id: '1',
        created_at: '2026-10-21T14:00:00.000Z',
        actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz',
      },
      {
        id: '1', tipo: 'CARGA_INICIAL', estado: 'HISTORICA', revision: 0,
        fecha_activacion: '2026-10-19T16:37:36.000Z', version_base_id: null,
        created_at: '2026-10-19T16:20:00.000Z',
        actor_legajo: null, actor_nombre: null, actor_apellido: null,
      },
    ],
  }
}

/** Cabecera y snapshot del borrador con dos filas del snapshot completo. */
function detalleBorrador(overrides = {}) {
  return {
    version: {
      id: '7', tipo: 'EDICION_LISTA', estado: 'PREPARACION', revision: 1,
      fecha_activacion: null, version_base_id: '1',
      created_at: '2026-10-21T14:00:00.000Z',
      actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz',
      ...overrides.version,
    },
    tarifas: overrides.tarifas ?? [
      { id: '101', plan_id: '1', plan_nombre: 'RUBI', tipo_ingreso: 'Obligatorio', rango_clave: '0-25', rango_etario: '0-25', rango_nota: null, precio: '100.00', activa: true },
      { id: '111', plan_id: '1', plan_nombre: 'RUBI', tipo_ingreso: 'Voluntario', rango_clave: '66+', rango_etario: '66-00', rango_nota: null, precio: '80.25', activa: false },
    ],
  }
}

/** Auditoria sintetica del borrador: creacion + aumento + una edicion. */
function resumenAuditoria() {
  return {
    version: { id: '7', estado: 'PREPARACION', revision: 1 },
    eventos: [
      {
        id: '9', tipo_evento: 'MODIFICACION', tipo_operacion: 'PRECIO', agrupador: null,
        entidad: { plan_id: '1', tipo_ingreso: 'Obligatorio', rango_clave: '0-25' },
        valor_anterior: '110.00', valor_nuevo: '123.45',
        detalle: 'mod. PRECIO del rango 0-25.',
        actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz',
        evento_en: '2026-10-21T16:03:00.000Z',
      },
      {
        id: '8', tipo_evento: 'MODIFICACION', tipo_operacion: 'AUMENTO_MASIVO', agrupador: null,
        entidad: null, valor_anterior: null, valor_nuevo: null, filas_agrupadas: 2,
        detalle: 'Se aumento un 10% el valor. Obligatorio, Voluntario.',
        actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz',
        evento_en: '2026-10-21T16:02:00.000Z',
      },
      {
        id: '6', tipo_evento: 'MODIFICACION', tipo_operacion: 'PRECIO', agrupador: '8',
        entidad: { plan_id: '1', tipo_ingreso: 'Obligatorio', rango_clave: '0-25' },
        valor_anterior: '100.00', valor_nuevo: '110.00',
        detalle: 'mod. PRECIO del rango 0-25.',
        actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz',
        evento_en: '2026-10-21T16:02:01.000Z',
      },
      {
        id: '5', tipo_evento: 'MODIFICACION', tipo_operacion: 'PRECIO', agrupador: '8',
        entidad: { plan_id: '1', tipo_ingreso: 'Voluntario', rango_clave: '66+' },
        valor_anterior: '80.25', valor_nuevo: '88.28',
        detalle: 'mod. PRECIO del rango 66+.',
        actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz',
        evento_en: '2026-10-21T16:02:02.000Z',
      },
      {
        id: '7', tipo_evento: 'CREACION', tipo_operacion: null, agrupador: null,
        entidad: null, valor_anterior: null, valor_nuevo: null,
        detalle: 'Creacion de la version 7.',
        actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz',
        evento_en: '2026-10-21T16:01:00.000Z',
      },
    ],
  }
}

/** Lista el historial y prepara el detalle del borrador para el arranque con ?id=7. */
function prepararEjecucion(expectativas = {}) {
  adminApi.listarVersiones.mockResolvedValue(expectativas.historial ?? historial())
  const detalle = detalleBorrador({
    version: expectativas.version,
    tarifas: expectativas.tarifas,
  })
  adminApi.obtenerVersion.mockResolvedValue({ version: detalle.version })
  adminApi.listarTarifasVersion.mockResolvedValue({ tarifas: detalle.tarifas })
  adminApi.obtenerEventosVersion.mockResolvedValue(
    expectativas.resumen ?? resumenAuditoria(),
  )
}

beforeEach(() => {
  prepararEjecucion()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('VersionesPage (SL-3 consultas)', () => {
  it('presenta el historial con responsables y la atribución del sistema', async () => {
    renderPantalla()

    expect(await screen.findByRole('heading', { name: 'Historial de versiones' })).toBeTruthy()
    expect(screen.getByText('#7')).toBeTruthy()
    expect(screen.getByText('Sistema (carga inicial)')).toBeTruthy()
    expect(screen.getByText('Ana Paz (0000000002)')).toBeTruthy()
  })

  it('carga el detalle del borrador con revision cuando llega por la URL', async () => {
    renderPantalla('?id=7')

    expect(await screen.findByText('Versión #7 · En preparación')).toBeTruthy()
    expect(await screen.findByRole('button', { name: 'Finalizar edición' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Activar versión' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Editar' }).length).toBe(2)
  })

  it('consulta a la API exactamente con el contrato SL-3 al abrir ?id=', async () => {
    renderPantalla('?id=7')

    await screen.findByText('Versión #7 · En preparación')
    expect(adminApi.obtenerVersion).toHaveBeenCalledWith('7')
    expect(adminApi.listarTarifasVersion).toHaveBeenCalledWith('7')
  })

  it('descarta el detalle, el resumen y los controles anteriores si falla la nueva versión', async () => {
    renderPantalla('?id=7')

    await screen.findByText('Versión #7 · En preparación')
    fireEvent.click(screen.getByRole('button', { name: 'Aumento masivo' }))
    expect(screen.getByLabelText('Porcentaje')).toBeTruthy()

    adminApi.obtenerVersion.mockRejectedValueOnce(new Error())
    fireEvent.click(screen.getByRole('button', { name: 'Ver' }))

    expect(await screen.findByText('No se pudo consultar el historial de versiones. Intenta nuevamente.')).toBeTruthy()
    expect(screen.queryByText('Versión #7 · En preparación')).toBeNull()
    expect(screen.queryByTestId('resumen-cambios')).toBeNull()

    const filaVersionSiete = screen.getByText('#7').closest('tr')
    fireEvent.click(within(filaVersionSiete).getByRole('button', { name: 'Ver' }))
    await screen.findByText('Versión #7 · En preparación')
    expect(screen.queryByLabelText('Porcentaje')).toBeNull()
    expect(screen.queryByText('No se pudo consultar el historial de versiones. Intenta nuevamente.')).toBeNull()
  })

  it('asigna las clases de historial y detalle a sus tarjetas correspondientes', async () => {
    renderPantalla('?id=7')

    const tituloHistorial = await screen.findByRole('heading', { name: 'Historial de versiones' })
    const tituloDetalle = await screen.findByText('Versión #7 · En preparación')
    expect(tituloHistorial.closest('.admin-vers-card').className).toContain('admin-vers-card--historial')
    expect(tituloDetalle.closest('.admin-vers-card').className).toContain('admin-vers-card--detalle')
  })

  it('muestra las fechas en español de Argentina y con la hora de Buenos Aires', async () => {
    renderPantalla('?id=7')

    await screen.findByText('Versión #7 · En preparación')
    expect(screen.getByText('21/10/2026, 11:00')).toBeTruthy()
    expect(screen.getByText('19/10/2026, 13:37')).toBeTruthy()
    expect(screen.getByText(/21\/10\/2026, 13:03/)).toBeTruthy()
  })
})

describe('VersionesPage (SL-4 ciclo de edición)', () => {
  it('abre el formulario de aumento masivo y envía el DTO con el campo obligatorio', async () => {
    adminApi.aumentarVersion.mockResolvedValue({ evento: { id: '12' }, filas: 2, revision: 2, porcentaje: '5' })
    adminApi.listarVersiones.mockResolvedValue(historial())
    renderPantalla('?id=7')

    fireEvent.click(await screen.findByRole('button', { name: 'Aumento masivo' }))
    const porcentaje = screen.getByLabelText('Porcentaje')
    fireEvent.change(porcentaje, { target: { value: '5' } })
    // Primer paso: la revision de la vista previa NO llama al backend.
    fireEvent.submit(porcentaje.closest('form'))
    expect(adminApi.aumentarVersion).not.toHaveBeenCalled()
    expect(screen.getByText('$ 105,00')).toBeTruthy()
    expect(screen.getByText('$ 84,26')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aumento' }))

    await waitFor(() => expect(adminApi.aumentarVersion).toHaveBeenCalledWith('7', {
      porcentaje: '5',
      revision: '1',
    }))
    // Tras el éxito el formulario se cierra, aparece el aviso de éxito
    // y la pantalla se recarga con la nueva revision.
    await waitFor(() => expect(screen.queryByLabelText('Porcentaje')).toBeNull())
    expect(await screen.findByText('Aumento masivo registrado')).toBeTruthy()
  })

  it('expone la modalidad opcional del aumento masivo cuando se elige', async () => {
    adminApi.aumentarVersion.mockResolvedValue({ evento: { id: '12' }, filas: 1, revision: 2, porcentaje: '5' })
    renderPantalla('?id=7')

    fireEvent.click(await screen.findByRole('button', { name: 'Aumento masivo' }))
    fireEvent.change(screen.getByLabelText('Porcentaje'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Modalidad'), { target: { value: 'Voluntario' } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar aumento' }))
    // La vista previa de una modalidad solo abarca las filas de esa modalidad.
    expect(screen.getByText(/sobre 1 fila\(s\)/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aumento' }))

    await waitFor(() => expect(adminApi.aumentarVersion).toHaveBeenCalledWith('7', {
      porcentaje: '5', tipoIngreso: 'Voluntario', revision: '1',
    }))
  })

  it('edita el precio de una fila y envia el PATCH con la revision visible', async () => {
    adminApi.editarPrecioTarifa.mockResolvedValue({
      tarifa: { id: '101', precio: '120.50' },
      revision: 2,
    })
    adminApi.obtenerVersion.mockResolvedValue({
      version: detalleBorrador({ version: { revision: 2 } }).version,
    })
    renderPantalla('?id=7')

    const filas = await screen.findAllByRole('button', { name: 'Editar' })
    fireEvent.click(filas[0])
    const input = screen.getByLabelText('Precio nuevo de 0-25')
    fireEvent.change(input, { target: { value: '120.50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(adminApi.editarPrecioTarifa).toHaveBeenCalledWith('7', '101', {
      precio: '120.50', revision: '2',
    }))
    await waitFor(() => expect(adminApi.listarTarifasVersion).toHaveBeenCalledTimes(2))
  })

  it('finaliza la edición con el cuerpo exacto del contrato', async () => {
    adminApi.finalizarVersion.mockResolvedValue({
      version: { id: '7', estado: 'LISTA_PARA_ACTIVAR', revision: 2 },
    })
    renderPantalla('?id=7')

    fireEvent.click(await screen.findByRole('button', { name: 'Finalizar edición' }))
    await waitFor(() => expect(adminApi.finalizarVersion).toHaveBeenCalledWith('7', { revision: '1' }))
  })
})

describe('VersionesPage (SL-5 activacion y casos A/D)', () => {
  it('copia la version activa como borrador y navega hacia el nuevo id', async () => {
    prepararEjecucion({
      historial: {
        versiones: [
          { ...historial().versiones[1], estado: 'ACTIVA', revision: 0 },
        ],
      },
      version: { id: '1', estado: 'ACTIVA', revision: 0 },
    })
    adminApi.crearBorradorTarifario.mockResolvedValue({
      version: { id: '12', estado: 'PREPARACION' },
    })
    renderPantalla('?id=1')

    fireEvent.click(await screen.findByRole('button', { name: 'Copiar versión como borrador' }))
    await waitFor(() => expect(adminApi.crearBorradorTarifario).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByTestId('ubicacion').textContent).toBe('?id=12'))
  })

  it('activa el borrador finalizado con la ruta de activación manual', async () => {
    prepararEjecucion({
      version: { estado: 'LISTA_PARA_ACTIVAR', revision: 3 },
    })
    adminApi.activarVersion.mockResolvedValue({
      version: { id: '7', estado: 'ACTIVA', revision: 3 },
      versionReemplazada: '1',
    })
    renderPantalla('?id=7')

    fireEvent.click(await screen.findByRole('button', { name: 'Activar versión' }))
    await waitFor(() => expect(adminApi.activarVersion).toHaveBeenCalledWith('7'))
  })

  it('presenta el aviso codificado del rechazo del ciclo sin recurrir a un fallo tecnico', async () => {
    prepararEjecucion({ version: { estado: 'LISTA_PARA_ACTIVAR', revision: 3 } })
    adminApi.activarVersion.mockRejectedValue(new ApiError({
      status: 409,
      message: 'No hay una version activa vigente que reemplazar por la edicion.',
      code: 'ADMIN_ESTADO',
    }))
    renderPantalla('?id=7')

    fireEvent.click(await screen.findByRole('button', { name: 'Activar versión' }))
    expect(await screen.findByText('La consulta fue rechazada')).toBeTruthy()
    expect(await screen.findByText('No hay una version activa vigente que reemplazar por la edicion.')).toBeTruthy()
  })

  it('presenta el aviso de concurrencia optimista desfasada como operacion rechazada', async () => {
    adminApi.editarPrecioTarifa.mockRejectedValue(new ApiError({
      status: 409,
      message: 'Otra operacion administrativa esta en curso; reintente en unos segundos.',
      code: 'ADMIN_CONCURRENCIA',
    }))
    renderPantalla('?id=7')

    fireEvent.click((await screen.findAllByRole('button', { name: 'Editar' }))[0])
    fireEvent.change(screen.getByLabelText('Precio nuevo de 0-25'), { target: { value: '120.50' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('La operación fue rechazada')).toBeTruthy()
    expect(await screen.findByText('Otra operacion administrativa esta en curso; reintente en unos segundos.')).toBeTruthy()
  })
})

describe('VersionesPage (edicion individual por fila)', () => {
  /** Despliega el borrador con dos filas (101: 100.00 / 111: 80.25). */
  async function renderBorradorDosFilas() {
    renderPantalla('?id=7')
    return screen.findByText('Versión #7 · En preparación')
  }

  it('inicializa el input con el precio real de la fila elegida y no afecta a las demás', async () => {
    await renderBorradorDosFilas()
    const editar = await screen.findAllByRole('button', { name: 'Editar' })
    // La segunda fila (111) abre su edición propia.
    fireEvent.click(editar[1])
    const input = screen.getByLabelText('Precio nuevo de 66+')
    expect(input).toBeTruthy()
    expect(input.value).toBe('80.25')
    // La otra fila permanece en modo lectura con su precio intacto.
    expect(screen.getByRole('button', { name: 'Editar' })).toBeTruthy()
    expect(screen.getByText('$ 100,00')).toBeTruthy()
  })

  it('abrir otra fila cierra la edición anterior sin guardar', async () => {
    await renderBorradorDosFilas()
    const editar = await screen.findAllByRole('button', { name: 'Editar' })
    fireEvent.click(editar[0])
    expect(screen.getByLabelText('Precio nuevo de 0-25')).toBeTruthy()
    // Cambiar a la otra fila descarta la primera edición sin llamar al backend.
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    expect(adminApi.editarPrecioTarifa).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Precio nuevo de 66+').value).toBe('80.25')
    expect(screen.queryByLabelText('Precio nuevo de 0-25')).toBeNull()
  })

  it('cancelar descarta el cambio de esa fila sin alterar la otra', async () => {
    await renderBorradorDosFilas()
    const editar = await screen.findAllByRole('button', { name: 'Editar' })
    fireEvent.click(editar[0])
    fireEvent.change(screen.getByLabelText('Precio nuevo de 0-25'), { target: { value: '150.00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })
    )
    expect(adminApi.editarPrecioTarifa).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Precio nuevo de 0-25')).toBeNull()
    // La fila regresa a lectura con su precio original visible.
    expect(screen.getByText('$ 100,00')).toBeTruthy()
    expect(screen.getByText('$ 80,25')).toBeTruthy()
  })

  it('guardar envia unicamente la tarifa activa y la actualizacion del servidor', async () => {
    adminApi.editarPrecioTarifa.mockResolvedValue({
      tarifa: { id: '101', precio: '150.00' },
      revision: 2,
    })
    await renderBorradorDosFilas()
    const editar = await screen.findAllByRole('button', { name: 'Editar' })
    fireEvent.click(editar[0])
    fireEvent.change(screen.getByLabelText('Precio nuevo de 0-25'), { target: { value: '150,00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    // Un solo PATCH, exclusivamente con la tarifa editada; la coma se
    // normaliza a punto para el DECIMAL del backend.
    await waitFor(() => expect(adminApi.editarPrecioTarifa).toHaveBeenCalledTimes(1))
    expect(adminApi.editarPrecioTarifa).toHaveBeenCalledWith('7', '101', {
      precio: '150.00',
      revision: '1',
    })
  })

  it('rechaza localmente un precio sin formato decimal antes de llamar al backend', async () => {
    await renderBorradorDosFilas()
    const editar = await screen.findAllByRole('button', { name: 'Editar' })
    fireEvent.click(editar[0])
    fireEvent.change(screen.getByLabelText('Precio nuevo de 0-25'), { target: { value: 'abc' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(adminApi.editarPrecioTarifa).not.toHaveBeenCalled()
    expect(await screen.findByText('Revisá el precio ingresado')).toBeTruthy()
  })
})

describe('VersionesPage (resumen de cambios y deshacer)', () => {
  it('presenta el resumen de la auditoria real con tipos amigables y valores', async () => {
    renderPantalla('?id=7')

    expect(await screen.findByTestId('resumen-cambios')).toBeTruthy()
    expect(screen.getAllByText('Fila del aumento').length).toBe(2)
    expect(screen.getAllByText('Edición de precio').length).toBe(1)
    expect(screen.getByText(/110,00 → \$ 123,45/)).toBeTruthy()
    expect(screen.getByText(/aumento un 10%/)).toBeTruthy()
    expect(screen.getByText(/2 fila\(s\)/)).toBeTruthy()
    expect(screen.getByText(/Obligatorio y Voluntario/)).toBeTruthy()
    expect(screen.getByText(/Creacion de la version 7/)).toBeTruthy()
    expect(screen.getAllByText(/Ana Paz \(0000000002\)/).length).toBeGreaterThanOrEqual(4)
  })

  it('arma la confirmación del deshacer en dos clics y revierte el último cambio', async () => {
    adminApi.deshacerUltimoCambio.mockResolvedValue({
      filas: 1, revision: 2, evento: { id: '10', tipo: 'DESHACER_EDICION' },
    })
    renderPantalla('?id=7')

    fireEvent.click(await screen.findByRole('button', { name: 'Deshacer último cambio' }))
    // Primer clic: no llama al backend aún.
    expect(adminApi.deshacerUltimoCambio).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Sí, deshacer' }))

    await waitFor(() => expect(adminApi.deshacerUltimoCambio).toHaveBeenCalledWith('7', 1))
    expect(await screen.findByText('Último cambio deshecho')).toBeTruthy()
  })

  it('permite cancelar la confirmación del deshacer sin llamar al backend', async () => {
    renderPantalla('?id=7')

    fireEvent.click(await screen.findByRole('button', { name: 'Deshacer último cambio' }))
    fireEvent.click(screen.getByRole('button', { name: 'No, volver' }))
    expect(adminApi.deshacerUltimoCambio).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Sí, deshacer' })).toBeNull()
  })
})

describe('VersionesPage (regresiones de la ronda de correcciones integrales)', () => {

  it('ordena el historial por prioridad: pendiente, vigente y luego historicas descendentes', async () => {
    // Cadena artificial en orden de creacion ascendente (como la envia el
    // backend: creada ASC): un borrador pendiente viejo, la ACTIVA y dos
    // historicas. La presentacion debe quedar #9, #8, #3 y #1.
    adminApi.listarVersiones.mockResolvedValue({
      versiones: [
        { id: '1', tipo: 'CARGA_INICIAL', estado: 'HISTORICA', revision: 0, version_base_id: null, created_at: '2026-10-19T16:20:00.000Z', actor_legajo: null, actor_nombre: null, actor_apellido: null, fecha_activacion: '2026-10-19T16:37:36.000Z' },
        { id: '3', tipo: 'EDICION_LISTA', estado: 'HISTORICA', revision: 0, version_base_id: '1', created_at: '2026-10-20T12:00:00.000Z', actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz', fecha_activacion: '2026-10-20T13:00:00.000Z' },
        { id: '8', tipo: 'CARGA_INICIAL', estado: 'ACTIVA', revision: 0, version_base_id: null, created_at: '2026-10-20T15:00:00.000Z', actor_legajo: null, actor_nombre: null, actor_apellido: null, fecha_activacion: '2026-10-20T15:10:00.000Z' },
        { id: '9', tipo: 'EDICION_LISTA', estado: 'PREPARACION', revision: 1, version_base_id: '8', created_at: '2026-10-21T14:00:00.000Z', actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz', fecha_activacion: null },
      ],
    })
    renderPantalla()

    expect(await screen.findByRole('heading', { name: 'Historial de versiones' })).toBeTruthy()
    // La presentacion debe quedar #9, #8, #3 y #1 (columna Versión).
    expect(await leerColumnaVersiones()).toEqual(['#9', '#8', '#3', '#1'])
    // La ACTIVA queda reconocible con la marca Vigente aunque no sea la
    // mas reciente ni la primera de su bloque.
    expect(screen.getByText('Vigente')).toBeTruthy()
  })

  it('tiene un historial sin version pendiente precedida por la ACTIVA', async () => {
    // Sin borrador abierto, la ACTIVA encabeza la cadena y siguen las
    // historicas mas nuevas primero.
    adminApi.listarVersiones.mockResolvedValue({
      versiones: [
        { id: '4', tipo: 'EDICION_LISTA', estado: 'HISTORICA', revision: 0, version_base_id: '2', created_at: '2026-10-19T20:00:00.000Z', actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz', fecha_activacion: '2026-10-19T21:00:00.000Z' },
        { id: '2', tipo: 'CARGA_INICIAL', estado: 'HISTORICA', revision: 0, version_base_id: null, created_at: '2026-10-19T16:20:00.000Z', actor_legajo: null, actor_nombre: null, actor_apellido: null, fecha_activacion: '2026-10-19T16:37:36.000Z' },
        { id: '5', tipo: 'CARGA_INICIAL', estado: 'ACTIVA', revision: 0, version_base_id: null, created_at: '2026-10-20T15:00:00.000Z', actor_legajo: null, actor_nombre: null, actor_apellido: null, fecha_activacion: '2026-10-20T15:10:00.000Z' },
      ],
    })
    renderPantalla()

    expect(await screen.findByRole('heading', { name: 'Historial de versiones' })).toBeTruthy()
    expect(await leerColumnaVersiones()).toEqual(['#5', '#4', '#2'])
  })

  it('recuperar una version historica crea un borrador nuevo y abre la pantalla sobre el', async () => {
    // La historica seleccionada abre su panel con el boton principal
    // Recuperar como borrador; el backend crea el borrador #12.
    prepararEjecucion({
      version: { id: '1', estado: 'HISTORICA', revision: 0 },
      resumen: eventosSinCambios(),
    })
    adminApi.recuperarVersionHistorica.mockResolvedValue({
      version: {
        id: '12', tipo: 'EDICION_LISTA', estado: 'PREPARACION',
        version_base_id: '1',
      },
    })
    renderPantalla('?id=1')

    // Boton principal del panel de detalle historico (no subtle).
    const boton = await screen.findByRole('button', { name: 'Recuperar como borrador' })
    expect(boton.className).toContain('admin-button')
    expect(boton.className).not.toContain('admin-button--subtle')
    fireEvent.click(boton)

    expect(await screen.findByText('Recuperaste la versión histórica')).toBeTruthy()
    expect(adminApi.recuperarVersionHistorica).toHaveBeenCalledTimes(1)
    expect(adminApi.recuperarVersionHistorica).toHaveBeenCalledWith('1')
    // La pantalla se abre sobre el borrador nuevo creado por el backend:
    // la navegacion viaja por una transición de react-router y puede
    // confirmarse un instante después del aviso, así que se espera
    // activamente a la URL en lugar de leerla inmediatamente.
    await waitFor(() => {
      expect(screen.getByTestId('ubicacion').textContent).toBe('?id=12')
    })
  })

  it('impide recuperar cuando ya hay una version pendiente y explica como continuar', async () => {
    prepararEjecucion({
      version: { id: '2', estado: 'HISTORICA', revision: 0 },
      resumen: eventosSinCambios(),
    })
    adminApi.recuperarVersionHistorica.mockRejectedValue(new ApiError({
      status: 409,
      message: 'Ya existe una version de precios en preparacion, iniciada por Ana Paz, legajo 0000000002, con fecha y hora 21/10/2026 16:01.',
      code: 'ADMIN_ESTADO',
    }))
    renderPantalla('?id=2')

    fireEvent.click(await screen.findByRole('button', { name: 'Recuperar como borrador' }))
    expect(await screen.findByText('La consulta fue rechazada')).toBeTruthy()
    expect(await screen.findByText(/Ya existe una version de precios en preparacion/)).toBeTruthy()
  })

  /** Evento CREACION sin cambios economicos: borrador recien copiado. */
  function eventosSinCambios() {
    return {
      version: { id: '7', estado: 'PREPARACION', revision: 0 },
      eventos: [
        {
          id: '3', tipo_evento: 'CREACION', tipo_operacion: null, agrupador: null,
          entidad: null, valor_anterior: null, valor_nuevo: null,
          detalle: 'Copia de la version vigente 1 con 2 filas de tarifas.',
          actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz',
          evento_en: '2026-10-21T16:01:00.000Z',
        },
      ],
    }
  }

  it('no habilita «Deshacer último cambio» en un borrador sin cambios economicos', async () => {
    prepararEjecucion({ resumen: eventosSinCambios() })
    renderPantalla('?id=7')

    const boton = await screen.findByRole('button', { name: 'Deshacer último cambio' })
    expect(boton.disabled).toBe(true)
    expect(boton.getAttribute('title')).toContain('No hay cambios')
    expect(adminApi.deshacerUltimoCambio).not.toHaveBeenCalled()
  })

  it('deshabilita el deshacer cuando todas las filas ya fueron revertidas', async () => {
    // Historial de un borrador cuyo aumentó masivo se deshizo por
    // completo: grupo DESHACE + un hijo DESHACE por fila (los precios
    // quedaron restaurados, no hay cambios pendientes).
    prepararEjecucion({
      resumen: {
        version: { id: '7', estado: 'PREPARACION', revision: 5 },
        eventos: [
          {
            id: '12', tipo_evento: 'MODIFICACION', tipo_operacion: 'AUMENTO_MASIVO', agrupador: null,
            entidad: null, valor_anterior: null, valor_nuevo: null, filas_agrupadas: 2,
            detalle: 'DESHACE: restablece los precios previos del ultimo aumento masivo aplicado a la version 7.',
            actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz',
            evento_en: '2026-10-21T16:06:00.000Z',
          },
          {
            id: '13', tipo_evento: 'MODIFICACION', tipo_operacion: 'PRECIO', agrupador: '12',
            entidad: { plan_id: '1', tipo_ingreso: 'Obligatorio', rango_clave: '0-25' },
            valor_anterior: '110.00', valor_nuevo: '100.00',
            detalle: 'DESHACE: restablece el precio previo de plan/modalidad/rango.',
            actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz',
            evento_en: '2026-10-21T16:06:01.000Z',
          },
          {
            id: '14', tipo_evento: 'MODIFICACION', tipo_operacion: 'PRECIO', agrupador: '12',
            entidad: { plan_id: '1', tipo_ingreso: 'Voluntario', rango_clave: '66+' },
            valor_anterior: '88.28', valor_nuevo: '80.25',
            detalle: 'DESHACE: restablece el precio previo de plan/modalidad/rango.',
            actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz',
            evento_en: '2026-10-21T16:06:02.000Z',
          },
          {
            id: '3', tipo_evento: 'CREACION', tipo_operacion: null, agrupador: null,
            entidad: null, valor_anterior: null, valor_nuevo: null,
            detalle: 'Copia de la version vigente 1 con 2 filas de tarifas.',
            actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz',
            evento_en: '2026-10-21T16:01:00.000Z',
          },
        ],
      },
    })
    renderPantalla('?id=7')

    const boton = await screen.findByRole('button', { name: 'Deshacer último cambio' })
    expect(boton.disabled).toBe(true)
  })

  it('mantiene habilitado el deshacer cuando queda una edición anterior de la misma tarifa', async () => {
    prepararEjecucion({
      resumen: {
        version: { id: '7', estado: 'PREPARACION', revision: 3 },
        eventos: [
          {
            id: '12', tipo_evento: 'MODIFICACION', tipo_operacion: 'PRECIO', agrupador: null,
            entidad: { plan_id: '1', tipo_ingreso: 'Obligatorio', rango_clave: '0-25' },
            valor_anterior: '120.00', valor_nuevo: '110.00',
            detalle: 'DESHACE: restablece el precio previo de plan/modalidad/rango.',
            actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz',
            evento_en: '2026-10-21T16:04:00.000Z',
          },
          {
            id: '11', tipo_evento: 'MODIFICACION', tipo_operacion: 'PRECIO', agrupador: null,
            entidad: { plan_id: '1', tipo_ingreso: 'Obligatorio', rango_clave: '0-25' },
            valor_anterior: '110.00', valor_nuevo: '120.00', detalle: 'mod. PRECIO del rango 0-25.',
            actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz',
            evento_en: '2026-10-21T16:03:00.000Z',
          },
          {
            id: '10', tipo_evento: 'MODIFICACION', tipo_operacion: 'PRECIO', agrupador: null,
            entidad: { plan_id: '1', tipo_ingreso: 'Obligatorio', rango_clave: '0-25' },
            valor_anterior: '100.00', valor_nuevo: '110.00', detalle: 'mod. PRECIO del rango 0-25.',
            actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz',
            evento_en: '2026-10-21T16:02:00.000Z',
          },
        ],
      },
    })
    renderPantalla('?id=7')

    const boton = await screen.findByRole('button', { name: 'Deshacer último cambio' })
    expect(boton.disabled).toBe(false)
  })

  it('permite deshacer una sola vez el último cambio vigente desde el primer intento', async () => {
    renderPantalla('?id=7')
    adminApi.deshacerUltimoCambio.mockResolvedValue({
      filas: 1,
      revision: 2,
      evento: { id: '11', tipo: 'DESHACER_EDICION' },
    })

    const boton = await screen.findByRole('button', { name: 'Deshacer último cambio' })
    expect(boton.disabled).toBe(false)
    fireEvent.click(boton)
    fireEvent.click(await screen.findByRole('button', { name: 'Sí, deshacer' }))

    await waitFor(() => expect(adminApi.deshacerUltimoCambio).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(adminApi.deshacerUltimoCambio).toHaveBeenCalledWith('7', 1))
    expect(await screen.findByText('Último cambio deshecho')).toBeTruthy()
  })

  it('ofrece «Volver a edición» en LISTA_PARA_ACTIVAR y confirma antes de reabrir', async () => {
    prepararEjecucion({ version: { estado: 'LISTA_PARA_ACTIVAR', revision: 3 } })
    adminApi.obtenerEventosVersion.mockResolvedValue({
      version: { id: '7', estado: 'LISTA_PARA_ACTIVAR', revision: 3 },
      eventos: eventosSinCambios().eventos,
    })
    adminApi.reanudarVersion.mockResolvedValue({
      version: { id: '7', tipo: 'EDICION_LISTA', estado: 'PREPARACION', revision: 3 },
      evento: { id: '9', tipo: 'REANUDACION' },
    })
    renderPantalla('?id=7')

    fireEvent.click(await screen.findByRole('button', { name: 'Volver a edición' }))
    expect(await screen.findByText(/La versión volverá a preparación/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sí, volver a edición' }))

    await waitFor(() => expect(adminApi.reanudarVersion).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Volviste a edición')).toBeTruthy()
  })

  it('no ofrece acciones de edición, deshacer ni reapertura para versiones ACTIVA o HISTORICA', async () => {
    prepararEjecucion({ version: { estado: 'ACTIVA', revision: 0 } })
    adminApi.obtenerEventosVersion.mockResolvedValue({
      version: { id: '7', estado: 'ACTIVA', revision: 0 },
      eventos: [],
    })
    renderPantalla('?id=7')

    await screen.findByRole('heading', { name: /Versión #7 · Activa/ })
    expect(screen.queryByRole('button', { name: 'Deshacer último cambio' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Finalizar edición' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Volver a edición' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
    // La acción permitida para ACTIVA sigue siendo copiar un borrador.
    expect(screen.getByRole('button', { name: 'Copiar versión como borrador' })).toBeTruthy()

    prepararEjecucion({ version: { estado: 'HISTORICA', revision: 7 } })
    // Estado HISTORICA: el detalle se volvió a preparar con ese estado.
    renderPantalla('?id=7')
    await screen.findByRole('heading', { name: /Versión #7 · Histórica/ })
    expect(screen.queryByRole('button', { name: 'Deshacer último cambio' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Volver a edición' })).toBeNull()
  })

  it('presenta el resumen compacto con la etiqueta amigable de la reapertura', async () => {
    const eventos = resumenAuditoria()
    eventos.eventos.unshift({
      id: '10', tipo_evento: 'REANUDACION', tipo_operacion: null, agrupador: null,
      entidad: null, valor_anterior: null, valor_nuevo: null,
      detalle: 'La version 7 volvio a preparacion (reapertura de la edicion de precios).',
      actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz',
      evento_en: '2026-10-21T16:05:00.000Z',
    })
    prepararEjecucion({ resumen: eventos })
    renderPantalla('?id=7')

    // El titulo del bloque y el listado de auditoria conviven sin
    // subtitulos redundantes.
    expect(await screen.findByText('Resumen de cambios')).toBeTruthy()
    expect(screen.queryByText('Operaciones auditadas.')).toBeNull()
    expect(await screen.findByText('Volver a edición')).toBeTruthy()
  })
});


describe('VersionesPage (descarte de versiones no activadas)', () => {
  /**
   * Auditoria minima sin cambios economicos: solo el evento CREACION,
   * valido para una version pendiente candidata al descarte.
   * @param {string} estado Estado de la version en el resumen.
   * @returns {object} Resumen con un solo evento.
   */
  function resumenSinCambios(estado) {
    return {
      version: { id: '7', estado, revision: 2 },
      eventos: [
        {
          id: '3', tipo_evento: 'CREACION', tipo_operacion: null, agrupador: null,
          entidad: null, valor_anterior: null, valor_nuevo: null,
          detalle: 'Copia de la version vigente 1 con 2 filas de tarifas.',
          actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz',
          evento_en: '2026-10-21T16:01:00.000Z',
        },
      ],
    }
  }

  /** Prepara el detalle de una version pendiente con el estado indicado. */
  function prepararPendiente(estado = 'PREPARACION') {
    prepararEjecucion({
      version: { id: '7', estado, revision: 2 },
      resumen: resumenSinCambios(estado),
    })
  }

  it('ofrece Descartar versión solo en versiones pendientes', async () => {
    prepararPendiente('PREPARACION')
    renderPantalla('?id=7')
    expect(await screen.findByRole('button', { name: 'Descartar versión' })).toBeTruthy()
    cleanup()

    prepararPendiente('LISTA_PARA_ACTIVAR')
    renderPantalla('?id=7')
    expect(await screen.findByRole('button', { name: 'Descartar versión' })).toBeTruthy()
    cleanup()

    // ACTIVA, HISTORICA y una ya descartada no ofrecen la acción: el
    // panel de la descartada queda solo lectura.
    prepararPendiente('ACTIVA')
    renderPantalla('?id=7')
    await screen.findByRole('heading', { name: /Versión #7 · Activa/ })
    expect(screen.queryByRole('button', { name: 'Descartar versión' })).toBeNull()
    cleanup()
    prepararPendiente('HISTORICA')
    renderPantalla('?id=7')
    await screen.findByRole('heading', { name: /Versión #7 · Histórica/ })
    expect(screen.queryByRole('button', { name: 'Descartar versión' })).toBeNull()
    cleanup()
    prepararPendiente('CANCELADA')
    renderPantalla('?id=7')
    await screen.findByRole('heading', { name: /Versión #7 · Descartada/ })
    expect(screen.queryByRole('button', { name: 'Descartar versión' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Activar versión' })).toBeNull()
  })

  it('exige confirmación y motivo antes de enviar el descarte', async () => {
    prepararPendiente('PREPARACION')
    adminApi.descartarVersion.mockResolvedValue({
      version: { id: '7', tipo: 'EDICION_LISTA', estado: 'CANCELADA', revision: 2 },
      evento: { id: '11', tipo: 'DESCARTE' },
    })
    renderPantalla('?id=7')

    fireEvent.click(await screen.findByRole('button', { name: 'Descartar versión' }))
    expect(await screen.findByText(/quedará fuera del ciclo/)).toBeTruthy()

    // Sin motivo el confirmar queda deshabilitado y no viaja el pedido.
    const confirmar = screen.getByRole('button', { name: 'Sí, descartar' })
    expect(confirmar.disabled).toBe(true)
    fireEvent.click(confirmar)
    expect(adminApi.descartarVersion).not.toHaveBeenCalled()

    // Con motivo la confirmación viaja con la revisión y el motivo.
    fireEvent.change(screen.getByLabelText('Motivo del descarte'), {
      target: { value: 'El cliente no aprobó la lista provisional.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sí, descartar' }))
    await waitFor(() => expect(adminApi.descartarVersion).toHaveBeenCalledTimes(1))
    expect(adminApi.descartarVersion).toHaveBeenCalledWith('7', {
      revision: 2,
      motivo: 'El cliente no aprobó la lista provisional.',
    })
    expect(await screen.findByText('Versión descartada')).toBeTruthy()
  })

  it('muestra la explicación del 409 cuando la revisión quedó desfasada', async () => {
    prepararPendiente('LISTA_PARA_ACTIVAR')
    adminApi.descartarVersion.mockRejectedValue(new ApiError({
      status: 409,
      message: 'La versión fue modificada por otra persona durante la edición; revisá el resumen y volvé a intentar.',
      code: 'ADMIN_CONCURRENCIA',
    }))
    renderPantalla('?id=7')

    fireEvent.click(await screen.findByRole('button', { name: 'Descartar versión' }))
    fireEvent.change(await screen.findByLabelText('Motivo del descarte'), {
      target: { value: 'Motivo válido del descarte.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sí, descartar' }))

    // ADMIN_CONCURRENCIA es codigo de escritura: el aviso asociado es
    // «La operación fue rechazada» con la explicacion del contrato.
    expect(await screen.findByText('La operación fue rechazada')).toBeTruthy()
    expect(await screen.findByText(/modificada por otra persona/)).toBeTruthy()
  })

  it('agrega las descartadas al historial solo cuando el filtro lo pide', async () => {
    // Cadena con la ACTIVA, una histórica y una versión descartada.
    adminApi.listarVersiones.mockResolvedValue({
      versiones: [
        { id: '1', tipo: 'CARGA_INICIAL', estado: 'HISTORICA', revision: 0, version_base_id: null, created_at: '2026-10-19T16:20:00.000Z', actor_legajo: null, actor_nombre: null, actor_apellido: null, fecha_activacion: '2026-10-19T16:37:36.000Z' },
        { id: '4', tipo: 'EDICION_LISTA', estado: 'CANCELADA', revision: 2, version_base_id: '1', created_at: '2026-10-20T18:00:00.000Z', actor_legajo: '0000000002', actor_nombre: 'Ana', actor_apellido: 'Paz', fecha_activacion: null },
        { id: '8', tipo: 'CARGA_INICIAL', estado: 'ACTIVA', revision: 0, version_base_id: null, created_at: '2026-10-20T15:00:00.000Z', actor_legajo: null, actor_nombre: null, actor_apellido: null, fecha_activacion: '2026-10-20T15:10:00.000Z' },
      ],
    })
    renderPantalla()

    expect(await screen.findByRole('heading', { name: 'Historial de versiones' })).toBeTruthy()
    // Por defecto la descartada NO se mezcla con las históricas.
    expect(await leerColumnaVersiones()).toEqual(['#8', '#1'])
    expect(screen.queryByText('Descartada')).toBeNull()

    // El filtro aparece porque hay una descartada y la agrega al final.
    fireEvent.click(screen.getByRole('button', { name: 'Descartadas' }))
    expect(await leerColumnaVersiones()).toEqual(['#8', '#1', '#4'])
    expect(await screen.findByText('Descartada')).toBeTruthy()
    // El filtro alterna para volver a ocultarlas.
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar descartadas' }))
    expect(await leerColumnaVersiones()).toEqual(['#8', '#1'])
  })
})
