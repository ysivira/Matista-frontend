import { CAMPOS_POLITICA, formatearPorcentaje } from '../components/politicaPresentacion.js'
import { DetallePolitica } from '../components/DetallePolitica.jsx'
import { useEffect, useRef, useState } from 'react'
import { adminApi } from '../api/adminApi.js'
import { avisoAdminPara } from '../components/avisoAdmin.js'
import { LoadingState } from '../../../shared/ui/LoadingState.jsx'
import { AuthAlert } from '../../auth/components/AuthAlert.jsx'
import { EncabezadoContextual } from '../../../shared/ui/EncabezadoContextual.jsx'

// El aporte de monotributo es un importe versionado de cada snapshot (021);
// TDC queda como descuento numérico: decidir aplicarlo es del Asesor, por lo
// que desaparece el interruptor global "TDC habilitado" del administrador.
const ETIQUETAS_POLITICA = Object.freeze({
  VIGENTE: 'Vigente',
  PROGRAMADA: 'Programada',
  HISTORICA: 'Histórica',
  CANCELADA: 'Cancelada',
})

const TIPOS_EVENTO = Object.freeze({
  CREACION: 'Creación',
  PROGRAMACION: 'Programación',
  MODIFICACION: 'Modificación',
  ACTIVACION: 'Activación',
  CANCELACION: 'Cancelación',
  RECUPERACION: 'Recuperación',
})

/**
 * Arma la identidad responsable como la presentan las demás pantallas:
 * "NOMBRE APELLIDO (legajo)".
 * @param {object} version Snapshot con actor_nombre, actor_apellido y actor_legajo.
 * @returns {string} Responsable legible o texto de respaldo.
 */
function presentarResponsable(version) {
  const legajo = version?.actor_legajo
  if (!legajo) return 'Responsable no registrado'
  return `${version.actor_nombre ?? ''} ${version.actor_apellido ?? ''} (${legajo})`.trim()
}

/** Convierte un instante del snapshot (ISO o MySQL UTC) a la vista local. */
function presentarFecha(valor) {
  return valor ? new Date(valor).toLocaleString('es-AR') : '—'
}

/** Convierte un instante a la cadena requerida por input datetime-local. */
function fechaALocal(valor) {
  if (!valor) return ''
  const fecha = new Date(valor)
  const pad = (numero) => String(numero).padStart(2, '0')
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`
}

/** Copia la versión objetivo al estado editable conservando nullables. */
function crearFormulario(politica) {
  return Object.fromEntries(CAMPOS_POLITICA.map((campo) => [
    campo.name,
    campo.opcional ? (politica[campo.name] ?? '') : politica[campo.name],
  ]))
}

/**
 * Compara dos valores de campo tratando vacíos y números de forma uniforme,
 * para detectar cambios comerciales reales sin fijar formatos de entrada.
 * @param {unknown} izquierdo Valor base del snapshot.
 * @param {unknown} derecho Valor editado.
 * @returns {boolean} true cuando representan un valor distinto.
 */
function valorCambio(izquierdo, derecho) {
  if (izquierdo === null || izquierdo === undefined) {
    return !(derecho === null || derecho === '' || derecho === undefined)
  }
  return Number(izquierdo) !== Number(derecho)
}

/**
 * Determina si la edición contiene un cambio real respecto del snapshot
 * objetivo: algún parámetro, el catálogo de descuentos, la fecha programada
 * o el paso a activación inmediata. Evita guardados sin sentido que el
 * backend igualmente rechazaría.
 * @param {object} objetivo Snapshot vigente u oportunidad programada.
 * @param {object} formulario Valores editados.
 * @param {number[]} porcentajes Catálogo editado como números.
 * @param {{modo: string, fecha: string}} activacion Selección de activación.
 * @returns {boolean} true cuando hay al menos un cambio persistible.
 */
function hayCambiosReales(objetivo, formulario, porcentajes, activacion) {
  const cambioCampos = CAMPOS_POLITICA.some((campo) => (
    valorCambio(objetivo[campo.name], formulario[campo.name] === '' ? null : formulario[campo.name])
  ))
  const catalogoBase = (objetivo.porcentajes_comerciales ?? []).map(Number).sort((a, b) => b - a)
  const cambioCatalogo = catalogoBase.length !== porcentajes.length
    || catalogoBase.some((valor, indice) => valor !== porcentajes[indice])
  if (!objetivo.estado || objetivo.estado === 'VIGENTE') {
    return cambioCampos || cambioCatalogo
  }
  // Edición de programación: mover la fecha o activar en el acto también cuenta.
  const fechaEditada = activacion.fecha ? new Date(activacion.fecha).toISOString() : null
  const cambioFecha = activacion.modo === 'PROGRAMADA' && (
    !fechaEditada
    || new Date(objetivo.fecha_vigencia).getTime() !== new Date(fechaEditada).getTime())
  return cambioCampos || cambioCatalogo || cambioFecha || activacion.modo === 'INMEDIATA'
}

/** Renderiza la auditoría de ciclo de vida con responsable y fecha. */
function EventosPolitica({ eventos }) {
  return (
    <ul className="admin-config__eventos">
      {eventos.map((evento) => (
        <li key={evento.id}>
          <strong>{TIPOS_EVENTO[evento.tipo_evento] ?? evento.tipo_evento}</strong>
          {' · '}{presentarResponsable(evento)}{' · '}{presentarFecha(evento.evento_en)}
          <p className="admin-config__help">{evento.detalle}</p>
        </li>
      ))}
    </ul>
  )
}

/** Pantalla ADMIN para consultar, programar, editar y recuperar la política comercial. */
export function ConfiguracionComercialPage() {
  const [politica, setPolitica] = useState(null)
  const [formulario, setFormulario] = useState({})
  const [porcentajes, setPorcentajes] = useState([])
  const [nuevoPorcentaje, setNuevoPorcentaje] = useState('')
  const [errorPorcentaje, setErrorPorcentaje] = useState('')
  const [modoEdicion, setModoEdicion] = useState(null)
  const [activacion, setActivacion] = useState({ modo: 'INMEDIATA', fecha: '' })
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState(null)
  const [confirmacion, setConfirmacion] = useState(null)
  const [historial, setHistorial] = useState(null)
  const [detalleHistorico, setDetalleHistorico] = useState(null)
  const consultaActualRef = useRef(0)
  // Marca en vuelo real para bloquear envíos dobles de escritura cuando los
  // clics comparten el mismo render (el estado `cargando` llega desfasado).
  const enVueloRef = useRef(false)

  /** Carga la vigente junto con su programación pendiente, si existe. */
  async function cargarPolitica() {
    const consulta = consultaActualRef.current + 1
    consultaActualRef.current = consulta
    setCargando(true)
    setAviso(null)
    try {
      const respuesta = await adminApi.obtenerPoliticaComercial()
      if (consulta === consultaActualRef.current) setPolitica(respuesta)
    } catch (error) {
      if (consulta === consultaActualRef.current) {
        setAviso(avisoAdminPara(error, 'No se pudo cargar la política comercial.'))
      }
    } finally {
      if (consulta === consultaActualRef.current) setCargando(false)
    }
  }

  useEffect(() => {
    queueMicrotask(cargarPolitica)
  }, [])

  const pendiente = politica?.programacion_pendiente ?? null
  const objetivoEdicion = modoEdicion === 'pendiente' ? pendiente : politica

  /** Inicia la edición: crea versión sobre la vigente o revisa la pendiente. */
  function iniciarEdicion(destino) {
    const objetivo = destino === 'pendiente' ? pendiente : politica
    if (!objetivo) return
    setFormulario(crearFormulario(objetivo))
    setPorcentajes((objetivo.porcentajes_comerciales ?? []).map(Number))
    setNuevoPorcentaje('')
    setErrorPorcentaje('')
    setActivacion(destino === 'pendiente'
      ? { modo: 'PROGRAMADA', fecha: fechaALocal(objetivo.fecha_vigencia) }
      : { modo: 'INMEDIATA', fecha: '' })
    setModoEdicion(destino)
  }

  /** Descarta exclusivamente el estado local de edición. */
  function cancelarEdicion() {
    setModoEdicion(null)
    setFormulario({})
    setPorcentajes([])
    setErrorPorcentaje('')
    setActivacion({ modo: 'INMEDIATA', fecha: '' })
  }

  /** Actualiza un parámetro del formulario conservando tipos primitivos. */
  function manejarCambio(evento) {
    const { name, value } = evento.target
    if (name === 'activacion-modo') {
      const modo = value
      setActivacion((anterior) => ({
        ...anterior,
        modo,
        fecha: modo === 'INMEDIATA' ? '' : anterior.fecha,
      }))
      return
    }
    if (name === 'activacion-fecha') {
      setActivacion((anterior) => ({ ...anterior, fecha: value }))
      return
    }
    setFormulario((anterior) => ({ ...anterior, [name]: value }))
  }

  /** Valida e incorpora un descuento comercial sin duplicados.
   *
   * La verificación de duplicados vive dentro del updater de setPorcentajes:
   * dos clics en el botón «+» antes del re-render comparten el mismo arreglo
   * renderizado y, si el chequeo se hace fuera, agregaría dos veces el mismo
   * valor y rompería React por claves duplicadas. */
  function agregarPorcentaje() {
    const valor = Number(nuevoPorcentaje)
    const centesimos = Math.round(valor * 100)
    if (!Number.isFinite(valor) || valor <= 0 || valor > 100 || Math.abs(valor * 100 - centesimos) > 1e-8) {
      setErrorPorcentaje('Ingresá un porcentaje mayor que 0 y menor o igual que 100, con hasta dos decimales.')
      return
    }
    if (porcentajes.some((porcentaje) => Math.round(porcentaje * 100) === centesimos)) {
      setErrorPorcentaje('Ese porcentaje ya fue agregado.')
      return
    }
    setPorcentajes((anteriores) => {
      if (anteriores.some((porcentaje) => Math.round(porcentaje * 100) === centesimos)) {
        return anteriores
      }
      return [...anteriores, centesimos / 100].sort((a, b) => b - a)
    })
    setNuevoPorcentaje('')
    setErrorPorcentaje('')
  }

  /** Quita un descuento del snapshot que todavía no fue guardado. */
  function quitarPorcentaje(valor) {
    setPorcentajes((anteriores) => anteriores.filter((porcentaje) => Math.round(porcentaje * 100) !== Math.round(valor * 100)))
  }

  /** Abre la confirmación sin ejecutar todavía ninguna escritura. */
  function solicitarGuardado() {
    setConfirmacion({ tipo: 'guardar' })
  }

  /** Convierte la fecha local del input a ISO con zona horaria explícita. */
  function fechaProgramadaISO() {
    return activacion.fecha ? new Date(activacion.fecha).toISOString() : null
  }

/** Guarda la edición como versión nueva o revisión de la programada.
 *
 * El aviso de error se fija DESPUÉS del refresco: cargarPolitica() arranca
 * con setAviso(null) y, si el aviso se pusiera antes que el refresco, el
 * mensaje del backend desaparecería al instante y el fallo sería invisible
 * para el usuario. También bloquea el envío doble mediante la referencia
 * enVuelo: dos clics rápidos en Confirmar comparten el cierre desactualizado
 * de `cargando` y podrían crear versiones duplicadas. */
async function guardarPolitica() {
  if (!objetivoEdicion || enVueloRef.current) return
  enVueloRef.current = true
  setCargando(true)
  setAviso(null)
  try {
    const datos = {
      ...formulario,
      afinidad_pct: formulario.afinidad_pct === '' ? null : formulario.afinidad_pct,
      aporte_adherente: formulario.aporte_adherente === '' ? null : formulario.aporte_adherente,
      iva_voluntario_pct: formulario.iva_voluntario_pct === '' ? null : formulario.iva_voluntario_pct,
      porcentajes_comerciales: porcentajes,
      activacion: activacion.modo === 'INMEDIATA'
        ? { modo: 'INMEDIATA' }
        : { modo: 'PROGRAMADA', fecha: fechaProgramadaISO() },
    }
    if (modoEdicion === 'pendiente') datos.revision = objetivoEdicion.revision
    await adminApi.actualizarPoliticaComercial(objetivoEdicion.id, datos)
    setConfirmacion(null)
    cancelarEdicion()
    await cargarPolitica()
    const respuestas = {
      vigente_inmediata: 'Se creó una nueva versión vigente de la política comercial.',
      vigente_programada: 'Se programó una nueva versión; la vigente rige hasta la fecha indicada.',
      pendiente_programada: 'Se actualizó la programación pendiente.',
      pendiente_inmediata: 'La programación quedó activa y reemplazó a la versión vigente.',
    }
    const clave = `${modoEdicion}_${activacion.modo.toLowerCase()}`
    setAviso({ tone: 'success', title: 'Política comercial actualizada', message: respuestas[clave] })
  } catch (error) {
    setConfirmacion(null)
    await cargarPolitica()
    setAviso(avisoAdminPara(error, 'No se pudo actualizar la política comercial.'))
  } finally {
    enVueloRef.current = false
    setCargando(false)
  }
}

  /** Abre la confirmación de cancelación de la programación pendiente. */
  function solicitarCancelacionPendiente() {
    setMotivoCancelacion('')
    setConfirmacion({ tipo: 'cancelar-pendiente', version: pendiente })
  }

  /** Cancela la única programación con revisión optimista y motivo.
   * El aviso de error se fija después del refresco para que cargarPolitica()
   * no lo borre; enVuelo evita el doble envío por confirmaciones repetidas. */
  async function cancelarProgramacionPendiente() {
    if (!confirmacion?.version || enVueloRef.current) return
    const motivo = motivoCancelacion.trim()
    if (motivo.length < 1 || motivo.length > 200) return
    enVueloRef.current = true
    setCargando(true)
    setAviso(null)
    try {
      const respuesta = await adminApi.cancelarProgramacionPoliticaComercial(
        confirmacion.version.id,
        { revision: confirmacion.version.revision, motivo },
      )
      setConfirmacion(null)
      await cargarPolitica()
      setAviso({
        tone: 'success',
        title: 'Programación cancelada',
        message: respuesta.version?.estado === 'CANCELADA'
          ? 'La programación quedó cancelada y conservó su motivo en el historial.'
          : 'La programación fue cancelada.',
      })
    } catch (error) {
      setConfirmacion(null)
      await cargarPolitica()
      setAviso(avisoAdminPara(error, 'No se pudo cancelar la programación.'))
    } finally {
      enVueloRef.current = false
      setCargando(false)
    }
  }

  /** Carga y abre el historial completo de snapshots comerciales. */
  async function abrirHistorial() {
    setCargando(true)
    setAviso(null)
    try {
      const respuesta = await adminApi.listarHistorialPoliticaComercial()
      setHistorial(respuesta.historial ?? [])
      setDetalleHistorico(null)
    } catch (error) {
      setAviso(avisoAdminPara(error, 'No se pudo cargar el historial de la política.'))
    } finally {
      setCargando(false)
    }
  }

  /** Consulta el snapshot completo y su auditoría dentro del historial. */
  async function abrirDetalleHistorico(versionId) {
    setCargando(true)
    try {
      setDetalleHistorico(await adminApi.obtenerDetallePoliticaComercial(versionId))
    } catch (error) {
      setAviso(avisoAdminPara(error, 'No se pudo cargar la versión seleccionada.'))
    } finally {
      setCargando(false)
    }
  }

  /** Cierra el historial y cualquier detalle o confirmación derivada. */
  function cerrarHistorial() {
    setHistorial(null)
    setDetalleHistorico(null)
    setConfirmacion(null)
  }

  /** Solicita confirmación para recuperar el snapshot histórico seleccionado. */
  function solicitarRecuperacion() {
    if (detalleHistorico?.estado === 'HISTORICA') {
      setConfirmacion({ tipo: 'recuperar', version: detalleHistorico })
    }
  }

  /** Recupera una versión histórica como una nueva versión vigente.
   * El aviso de error se fija después del refresco para que cargarPolitica()
   * no lo borre; enVuelo evita el doble envío por confirmaciones repetidas. */
  async function recuperarPolitica() {
    if (!confirmacion?.version || enVueloRef.current) return
    enVueloRef.current = true
    setCargando(true)
    setAviso(null)
    try {
      const respuesta = await adminApi.recuperarPoliticaComercial(confirmacion.version.id)
      setConfirmacion(null)
      cerrarHistorial()
      await cargarPolitica()
      setAviso({
        tone: 'success',
        title: 'Política recuperada',
        message: respuesta.estado === 'PROGRAMADA'
          ? `La versión #${confirmacion.version.id} quedó programada como nueva versión.`
          : `La versión #${confirmacion.version.id} se copió como una nueva versión vigente.`,
      })
    } catch (error) {
      cerrarHistorial()
      await cargarPolitica()
      setAviso(avisoAdminPara(error, 'No se pudo recuperar la política comercial.'))
    } finally {
      enVueloRef.current = false
      setCargando(false)
    }
  }

  if (cargando && !politica) return <LoadingState message="Cargando configuración comercial..." />

  const guardadoSinCambios = modoEdicion
    && objetivoEdicion
    && !hayCambiosReales(objetivoEdicion, formulario, porcentajes, activacion)

  return (
    <div className="admin-config-comercial">
      <EncabezadoContextual
        etiqueta="Módulo ADMIN · Configuración"
        titulo="Configuración comercial"
        descripcion="Gestioná los parámetros y descuentos autorizados que utilizan las cotizaciones."
      />
      {aviso ? <AuthAlert tone={aviso.tone} title={aviso.title}>{aviso.message}</AuthAlert> : null}

      <section className="admin-card admin-config__seccion">
        <header className="admin-config__header">
          <h2 className="admin-config__titulo">Política comercial vigente</h2>
          <div className="admin-config__acciones">
            {!modoEdicion ? (
              <>
                <button type="button" className="admin-button admin-button--ghost" onClick={abrirHistorial} disabled={cargando}>Historial</button>
                {pendiente ? (
                  <>
                    <button type="button" className="admin-button admin-button--danger" onClick={solicitarCancelacionPendiente} disabled={cargando}>Cancelar programación</button>
                    <button type="button" className="admin-button admin-button--subtle" onClick={() => iniciarEdicion('pendiente')} disabled={cargando}>Editar programación</button>
                  </>
                ) : null}
                <button type="button" className="admin-button admin-button--subtle" onClick={() => iniciarEdicion('vigente')} disabled={!politica || cargando}>Nueva política</button>
              </>
            ) : (
              <>
                <button type="button" className="admin-button admin-button--ghost" onClick={cancelarEdicion}>Cancelar</button>
                <button type="submit" form="politica-comercial-form" className="admin-button" disabled={cargando || guardadoSinCambios}>
                  {guardadoSinCambios ? 'Sin cambios para guardar' : 'Guardar'}
                </button>
              </>
            )}
          </div>
        </header>

        {modoEdicion && objetivoEdicion ? (
          <form id="politica-comercial-form" className="admin-config__form" onSubmit={(evento) => { evento.preventDefault(); solicitarGuardado() }}>
            <p className="admin-config__edicion-destino">
              {modoEdicion === 'pendiente'
                ? `Editando la programación pendiente #${objetivoEdicion.id} con revisión ${objetivoEdicion.revision}.`
                : `Creando una nueva versión a partir de la vigente #${objetivoEdicion.id}.`}
            </p>
            <div className="admin-config__grid">
              {CAMPOS_POLITICA.map((campo) => (
                <div key={campo.name} className="admin-config__campo">
                  <label className="admin-config__label" htmlFor={campo.name}>
                    {campo.label}{!campo.opcional && campo.tipo !== 'checkbox' ? <span className="admin-config__requerido">*</span> : null}
                  </label>
                  {campo.tipo === 'checkbox' ? (
                    <label className="admin-config__checkbox-wrap">
                      <input type="checkbox" id={campo.name} name={campo.name} checked={Number(formulario[campo.name]) === 1} onChange={manejarCambio} />
                      <span className="admin-config__checkbox-label">Habilitado</span>
                    </label>
                  ) : (
                    <input className="admin-config__input" aria-describedby={campo.help ? `help-${campo.name}` : undefined} type={campo.tipo} id={campo.name} name={campo.name} value={formulario[campo.name] ?? ''} step={campo.step} min={campo.min} max={campo.max} required={!campo.opcional} onChange={manejarCambio} />
                  )}
                  {campo.help ? <p className="admin-config__help" id={`help-${campo.name}`}>{campo.help}</p> : null}
                </div>
              ))}
            </div>

            <fieldset className="admin-config__activacion">
              <legend className="admin-config__label">Activación de la versión</legend>
              <label className="admin-config__radio-wrap">
                <input type="radio" name="activacion-modo" value="INMEDIATA" checked={activacion.modo === 'INMEDIATA'} onChange={manejarCambio} />
                <span>Activar inmediatamente</span>
              </label>
              <label className="admin-config__radio-wrap">
                <input type="radio" name="activacion-modo" value="PROGRAMADA" checked={activacion.modo === 'PROGRAMADA'} onChange={manejarCambio} />
                <span>Programar para</span>
              </label>
              <input
                className="admin-config__input"
                type="datetime-local"
                name="activacion-fecha"
                aria-label="Fecha y hora de activación programada"
                value={activacion.fecha}
                min={fechaALocal(new Date())}
                required={activacion.modo === 'PROGRAMADA'}
                disabled={activacion.modo !== 'PROGRAMADA'}
                onChange={manejarCambio}
              />
            </fieldset>

            <section className="admin-config__descuentos-editor">
              <h3 className="admin-config__grupo-titulo">Descuentos comerciales autorizados</h3>
              <div className="admin-config__agregar-descuento">
                <label className="admin-config__campo" htmlFor="nuevo-descuento">
                  <span className="admin-config__label">Descuento comercial</span>
                  <input className="admin-config__input" id="nuevo-descuento" type="number" min="0.01" max="100" step="0.01" value={nuevoPorcentaje} onChange={(evento) => setNuevoPorcentaje(evento.target.value)} />
                </label>
                <button type="button" className="admin-button admin-config__boton-mas" onClick={agregarPorcentaje} aria-label="Agregar descuento comercial">+</button>
              </div>
              {errorPorcentaje ? <p className="admin-config__error">{errorPorcentaje}</p> : null}
              <div className="admin-config__chips">
                {porcentajes.map((porcentaje) => (
                  <span key={porcentaje} className="admin-config__chip admin-config__chip--editable">
                    {formatearPorcentaje(porcentaje)}
                    <button type="button" onClick={() => quitarPorcentaje(porcentaje)} aria-label={`Quitar ${formatearPorcentaje(porcentaje)}`}>×</button>
                  </span>
                ))}
              </div>
            </section>
          </form>
        ) : (
          <>
            <DetallePolitica politica={politica} />
            {pendiente ? (
              <section className="admin-config__pendiente" aria-label="Programación pendiente">
                <h3 className="admin-config__grupo-titulo">Programación pendiente #{pendiente.id}</h3>
                <p>
                  <strong>{ETIQUETAS_POLITICA.PROGRAMADA}</strong> · rige desde {presentarFecha(pendiente.fecha_vigencia)}
                  {' · revisión '}{pendiente.revision}{' · responsable '}{presentarResponsable(pendiente)}
                </p>
                <DetallePolitica politica={pendiente} compacto />
              </section>
            ) : null}
          </>
        )}

        <footer className="admin-card__footer">
          <span>Última actualización: {politica ? presentarFecha(politica.fecha_vigencia) : '—'}</span>
          {politica ? <span>· Por: {presentarResponsable(politica)}</span> : null}
        </footer>
      </section>

      {historial ? (
        <div className="admin-modal__backdrop" onClick={cerrarHistorial}>
          <div className="admin-modal admin-config__historial-modal" onClick={(evento) => evento.stopPropagation()}>
            <header className="admin-modal__header">
              <div>
                <h3 className="admin-modal__title">Historial de política comercial</h3>
                <p className="admin-modal__subtitle">Cada fila conserva sus parámetros, descuentos y responsable.</p>
              </div>
              <button type="button" className="admin-modal__close" onClick={cerrarHistorial} aria-label="Cerrar">×</button>
            </header>
            <div className="admin-modal__body admin-config__historial-body">
              <div className="admin-config__versiones">
                {historial.map((version) => (
                  <button key={version.id} type="button" className={`admin-config__version${detalleHistorico?.id === version.id ? ' admin-config__version--activa' : ''}`} onClick={() => abrirDetalleHistorico(version.id)}>
                    <strong>Versión #{version.id} · {ETIQUETAS_POLITICA[version.estado] ?? version.estado}</strong>
                    <span>{presentarFecha(version.fecha_vigencia)}</span>
                    <span>{presentarResponsable(version)}{version.cancelada_en ? ` · Cancelada el ${presentarFecha(version.cancelada_en)}` : ''}</span>
                  </button>
                ))}
              </div>
              {detalleHistorico ? (
                <div className="admin-config__detalle-historico">
                  {detalleHistorico.motivo_cancelacion
                    ? <p className="admin-config__help">Cancelada el {presentarFecha(detalleHistorico.cancelada_en)}: {detalleHistorico.motivo_cancelacion}</p>
                    : null}
                  <DetallePolitica politica={detalleHistorico} compacto />
                  {(detalleHistorico.eventos ?? []).length > 0 ? <EventosPolitica eventos={detalleHistorico.eventos} /> : null}
                  {detalleHistorico.estado === 'HISTORICA'
                    ? <button type="button" className="admin-button" onClick={solicitarRecuperacion}>Recuperar esta versión</button>
                    : null}
                </div>
              ) : <p className="admin-config__vacio">Seleccioná una versión para consultar todos sus valores.</p>}
            </div>
          </div>
        </div>
      ) : null}

      {confirmacion ? (
        <div className="admin-modal__backdrop" onClick={() => !cargando && setConfirmacion(null)}>
          <div className="admin-modal admin-modal--center" onClick={(evento) => evento.stopPropagation()}>
            <header className="admin-modal__header">
              <div>
                <h3 className="admin-modal__title">
                  {confirmacion.tipo === 'guardar' ? 'Confirmar guardado' : confirmacion.tipo === 'cancelar-pendiente' ? 'Confirmar cancelación' : 'Confirmar recuperación'}
                </h3>
              </div>
            </header>
            <div className="admin-modal__body">
              {confirmacion.tipo === 'guardar' ? (
                <>
                  <p className="admin-modal__lead">
                    {modoEdicion === 'pendiente'
                      ? `Se revisará la programación #${objetivoEdicion?.id}.`
                      : activacion.modo === 'INMEDIATA'
                        ? 'Se guardarán todos los parámetros y descuentos como una nueva versión vigente; la actual quedará en el historial.'
                        : 'Se guardará la versión como programada; la vigente rige hasta la fecha elegida.'}
                  </p>
                  {activacion.modo === 'PROGRAMADA' ? (
                    <p className="admin-modal__lead">Activación programada para {presentarFecha(fechaProgramadaISO())}.</p>
                  ) : null}
                </>
              ) : null}
              {confirmacion.tipo === 'cancelar-pendiente' ? (
                <>
                  <p className="admin-modal__lead">
                    La programación #{confirmacion.version?.id} no se aplicará y quedará cancelada con su motivo. La vigente sigue rigiendo.
                  </p>
                  <label className="admin-config__campo" htmlFor="motivo-cancelacion">
                    <span className="admin-config__label">Motivo de cancelación *</span>
                    <textarea
                      className="admin-config__input"
                      id="motivo-cancelacion"
                      rows="3"
                      maxLength="200"
                      value={motivoCancelacion}
                      onChange={(evento) => setMotivoCancelacion(evento.target.value)}
                      placeholder="Indicá el motivo (1 a 200 caracteres)."
                    />
                  </label>
                </>
              ) : null}
              {confirmacion.tipo === 'recuperar' ? (
                <p className="admin-modal__lead">
                  Se creará una nueva versión vigente copiando íntegramente la versión #{confirmacion.version?.id}.
                </p>
              ) : null}
            </div>
            <footer className="admin-modal__actions">
              <button type="button" className="admin-button admin-button--ghost" onClick={() => setConfirmacion(null)} disabled={cargando}>Cancelar</button>
              {(() => {
                // Cada tipo de confirmación delega a su operación; el botón
                // principal queda deshabilitado mientras falte el motivo.
                const acciones = {
                  guardar: guardarPolitica,
                  'cancelar-pendiente': cancelarProgramacionPendiente,
                  recuperar: recuperarPolitica,
                }
                return (
                  <>
                    {confirmacion.tipo === 'cancelar-pendiente' ? (
                      <button
                        type="button"
                        className="admin-button admin-button--danger"
                        onClick={acciones[confirmacion.tipo]}
                        disabled={cargando || motivoCancelacion.trim().length < 1}
                      >
                        Confirmar cancelación
                      </button>
                    ) : (
                      <button type="button" className="admin-button" onClick={acciones[confirmacion.tipo]} disabled={cargando}>
                        {cargando ? 'Procesando...' : 'Confirmar'}
                      </button>
                    )}
                  </>
                )
              })()}
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  )
}
