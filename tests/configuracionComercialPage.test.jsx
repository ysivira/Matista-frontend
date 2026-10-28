/**
 * ============================================================
 * MATISTA | PRUEBAS DE GUARDADO COMERCIAL
 * ============================================================
 *
 * Archivo: configuracionComercialPage.test.jsx
 * Módulo: Pruebas administrativas
 *
 * Responsabilidad:
 * Probar guardado inmediato o programado, errores y bloqueo
 * de doble confirmación con respuestas controladas de la API.
 *
 * ============================================================
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ConfiguracionComercialPage } from '../src/features/admin/pages/ConfiguracionComercialPage.jsx'
import { adminApi } from '../src/features/admin/api/adminApi.js'
import { ApiError } from '../src/shared/lib/httpClient.js'

vi.mock('../src/features/admin/api/adminApi.js', () => ({
  adminApi: {
    obtenerPoliticaComercial: vi.fn(),
    actualizarPoliticaComercial: vi.fn(),
    listarHistorialPoliticaComercial: vi.fn(),
    obtenerDetallePoliticaComercial: vi.fn(),
    recuperarPoliticaComercial: vi.fn(),
    cancelarProgramacionPoliticaComercial: vi.fn(),
    obtenerEventosPoliticaComercial: vi.fn(),
  },
}))

/** Snapshot vigente identico al de la base de desarrollo usada en el bug. */
function vigenteDev() {
  return {
    id: '3', estado: 'VIGENTE', revision: '0', version_base_id: null,
    porcentaje_aporte_reconocido: '7.00', tope_sueldo_bruto: '4800000.00',
    joven_porcentaje: '26.00', comercial_fijo_max_pct: '40.00',
    comercial_fijo_meses_max: 12, comercial_escalonado_max_pct: '50.00',
    comercial_escalonado_tramos_max: 4, comercial_escalonado_total_meses_max: 12,
    primer_tramo_50_meses_max: 3, tdc_pct: '5.00', tdc_habilitado: 1,
    tope_comercial_tdc_pct: '60.00', aporte_monotributo: '23892.00',
    afinidad_pct: '10.00', fecha_vigencia: '2026-10-22T21:40:17.334Z',
    vigente_hasta: null, cancelada_en: null, cancelada_por: null, motivo_cancelacion: null,
    actor_legajo: '12345678', actor_nombre: 'DAVID', actor_apellido: 'DIAZ',
    porcentajes_comerciales: ['50.00', '45.00', '40.00', '35.00', '30.00', '25.00', '20.00', '15.00', '10.00'],
    programacion_pendiente: null,
  }
}

function renderPantalla() {
  return render(<ConfiguracionComercialPage />)
}

beforeEach(() => {
  adminApi.obtenerPoliticaComercial.mockReset()
  adminApi.obtenerPoliticaComercial.mockResolvedValue(vigenteDev())
  adminApi.actualizarPoliticaComercial.mockReset()
})

afterEach(() => cleanup())

/** Edita el descuento joven para garantizar un cambio real respecto del snapshot. */
async function editarJoven(valor) {
  const campo = await screen.findByLabelText(/Descuento joven/)
  fireEvent.change(campo, { target: { value: valor } })
}

/** Recorre la pantalla hasta el modal de confirmación de guardado. */
async function abrirConfirmacionGuardado() {
  const botonNueva = await screen.findByRole('button', { name: 'Nueva política' })
  fireEvent.click(botonNueva)
  await editarJoven('25')
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  await screen.findByText('Confirmar guardado')
}

describe('ConfiguracionComercialPage — guardado real', () => {
  it('activación inmediata: envía el PUT, sale de edición y refresca la vigente', async () => {
    adminApi.actualizarPoliticaComercial.mockResolvedValue({ ...vigenteDev(), id: '4', joven_porcentaje: '25.00' })
    renderPantalla()
    await abrirConfirmacionGuardado()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => {
      expect(adminApi.actualizarPoliticaComercial).toHaveBeenCalledTimes(1)
    })
    const [idEnviado, cuerpo] = adminApi.actualizarPoliticaComercial.mock.calls[0]
    expect(idEnviado).toBe('3')
    expect(cuerpo.joven_porcentaje).toBe('25')
    expect(cuerpo.porcentajes_comerciales).toHaveLength(9)
    expect(cuerpo.activacion).toEqual({ modo: 'INMEDIATA' })
    expect(Object.keys(cuerpo)).not.toContain('revision')
    expect(Object.keys(cuerpo)).not.toContain('estado')

    // Sale del modo edición y muestra refresco.
    await screen.findByRole('button', { name: 'Nueva política' })
    await waitFor(() => {
      expect(adminApi.obtenerPoliticaComercial).toHaveBeenCalledTimes(2)
    })
    await screen.findByText(/Se creó una nueva versión vigente/)
    expect(screen.queryByText('Confirmar guardado')).toBeNull()
  })

  it('activación programada: envía la fecha ISO y deja la vigente como rige', async () => {
    adminApi.actualizarPoliticaComercial.mockResolvedValue({ ...vigenteDev(), id: '5', estado: 'PROGRAMADA' })
    renderPantalla()
    const botonNueva = await screen.findByRole('button', { name: 'Nueva política' })
    fireEvent.click(botonNueva)
    await editarJoven('25')
    fireEvent.click(screen.getByRole('radio', { name: /Programar para/ }))
    fireEvent.change(screen.getByLabelText('Fecha y hora de activación programada'), { target: { value: '2026-12-01T15:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await screen.findByText('Confirmar guardado')
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await waitFor(() => {
      expect(adminApi.actualizarPoliticaComercial).toHaveBeenCalledTimes(1)
    })
    const [idEnviado, cuerpo] = adminApi.actualizarPoliticaComercial.mock.calls[0]
    expect(idEnviado).toBe('3')
    expect(cuerpo.activacion).toEqual({ modo: 'PROGRAMADA', fecha: new Date('2026-12-01T15:30').toISOString() })

    await screen.findByText(/Se programó una nueva versión/)
    await waitFor(() => {
      expect(adminApi.obtenerPoliticaComercial).toHaveBeenCalledTimes(2)
    })
  })

  it('muestra el error del backend y conserva el modo edición sin duplicar versiones', async () => {
    adminApi.actualizarPoliticaComercial.mockRejectedValue(new ApiError({
      status: 409, code: 'ADMIN_CONCURRENCIA', message: 'Otra operación está en curso.',
    }))
    renderPantalla()
    await abrirConfirmacionGuardado()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))

    await screen.findByText(/Otra operación está en curso/)
    // Reintento solo un PUT por confirmación: nada de doble envío.
    expect(adminApi.actualizarPoliticaComercial).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Confirmar guardado')).toBeNull()
  })

  it('doble confirmación rápida: envía un único PUT aunque los clics compartan render', async () => {
    let resuelto
    adminApi.actualizarPoliticaComercial.mockReturnValue(new Promise((resolve) => {
      resuelto = resolve
    }))
    renderPantalla()
    await abrirConfirmacionGuardado()
    // Dos clics antes de re-render: comparten el mismo closure con cargando=false.
    const boton = screen.getByRole('button', { name: 'Confirmar' })
    fireEvent.click(boton)
    fireEvent.click(boton)
    resuelto({ ...vigenteDev(), id: '9', joven_porcentaje: '25.00' })

    await waitFor(() => {
      expect(adminApi.actualizarPoliticaComercial).toHaveBeenCalledTimes(1)
    })
    await screen.findByRole('button', { name: 'Nueva política' })
  })
})
