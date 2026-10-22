import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi } from '../api/adminApi.js'
import { avisoAdminPara } from '../components/avisoAdmin.js'
import { formatearPrecioARS } from '../components/formatoMonetario.js'
import { ChipEstado } from '../components/ChipEstado.jsx'
import { LoadingState } from '../../../shared/ui/LoadingState.jsx'
import { AuthAlert } from '../../auth/components/AuthAlert.jsx'
import { EncabezadoContextual } from '../../../shared/ui/EncabezadoContextual.jsx'

/**
 * Modalidades de ingreso exactas definidas por el contrato SL-2. El valor es
 * el que viaja a la API y el que devuelve el backend; el texto es la
 * denominación visible de la lista de precios aprobada.
 */
const MODALIDADES = Object.freeze([
  { valor: 'Obligatorio', texto: 'Obligatorio/Monotributo' },
  { valor: 'Voluntario', texto: 'Voluntario' },
])

/**
 * Devuelve la denominación visible de una modalidad del tarifario.
 * @param {string} modalidad Valor interno de la modalidad ('Obligatorio', 'Voluntario').
 * @returns {string} Texto mostrado en selectores y etiquetas de la pantalla.
 */
function textoModalidad(modalidad) {
  return MODALIDADES.find((opcion) => opcion.valor === modalidad)?.texto ?? modalidad
}

/**
 * Formatea la fecha real de vigencia de la versión con el huso y el formato
 * local de Argentina. Si la fecha no existe o no es interpretable, devuelve
 * null para que la vista omita el dato en lugar de mostrar un valor inventado.
 * @param {string|null|undefined} fecha Fecha de activación recibida del backend.
 * @returns {string|null} Fecha legible o null cuando no hay dato disponible.
 */
function formatearVigencia(fecha) {
  if (!fecha) return null
  const instante = new Date(fecha)
  if (Number.isNaN(instante.getTime())) return null
  return instante.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
}

/**
 * Normaliza un texto para la búsqueda por segmento o edad: sin diacríticos y
 * en mayúsculas, de modo que «matrimonio» encuentre «MATRIMONIO».
 * @param {string|null} texto Texto a normalizar.
 * @returns {string} Texto normalizado.
 */
function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

/**
 * Pantalla de Gestión de Precios (RF-D07, HU-ADM-04) con la estructura visual
 * aprobada en Stitch «Asesor — Consultar Listas de Precios»: encabezado
 * contextual con el indicador de tarifas vigentes, panel de filtros (plan,
 * modalidad tarifaria y búsqueda por segmento o edad) y tarjeta de resultados
 * con el plan, la modalidad, la cantidad de segmentos y la tabla de precios
 * vigentes. Solo se emplean datos reales del backend: la versión, su estado y
 * su fecha de activación provienen de la respuesta vigente.
 * @returns {import('react').ReactElement} Lista de precios vigentes.
 */
export function TarifarioPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const planIdParam = searchParams.get('planId')
  const modalidadParam = searchParams.get('modalidad')
  const tipoModalidad = MODALIDADES.some((opcion) => opcion.valor === modalidadParam) ? modalidadParam : 'Obligatorio'

  const [planes, setPlanes] = useState(null) // null: catálogo aún no consultado
  const [matriz, setMatriz] = useState(null) // { plan, tipo_ingreso, version, tarifas }
  const [busqueda, setBusqueda] = useState('') // Filtro local por segmento o edad
  const [cargando, setCargando] = useState(true)
  const [recargando, setRecargando] = useState(false)
  const [aviso, setAviso] = useState(null)
  const consultaActualRef = useRef(0)
  const datosCargadosRef = useRef(false) // La primera consulta despliega la pantalla completa

  /**
   * Carga el catálogo y la matriz vigente de la selección actual. El plan viene
   * de la URL; si falta, se usa el primero del catálogo. El backend conserva la
   * autoridad: plan inexistente, inactivo o sin versión vigente se presenta
   * como aviso con el mensaje público del contrato.
   * @param {string|null} planIdParam Identificador del plan tomado de la URL.
   * @param {string} modalidad Modalidad exacta de la consulta.
   * @returns {Promise<void>} Finaliza al aplicar la matriz o el aviso.
   */
  async function cargar(planIdParam, modalidad) {
    const consulta = consultaActualRef.current + 1
    consultaActualRef.current = consulta
    if (datosCargadosRef.current) setRecargando(true)
    else setCargando(true)
    setAviso(null)
    try {
      const catalogo = await adminApi.listarPlanes()
      const planesVigentes = catalogo.planes ?? []
      const seleccion = planIdParam ?? planesVigentes[0]?.id ?? null
      if (seleccion == null) {
        setPlanes([])
        setMatriz(null)
      } else {
        const respuesta = await adminApi.consultarTarifario(seleccion, modalidad)
        if (consulta !== consultaActualRef.current) return
        setPlanes(planesVigentes)
        setMatriz(respuesta)
      }
      datosCargadosRef.current = true
    } catch (error) {
      if (consulta !== consultaActualRef.current) return
      setAviso(avisoAdminPara(error, 'No se pudo consultar la matriz vigente. Intenta nuevamente.'))
    } finally {
      if (consulta === consultaActualRef.current) {
        setCargando(false)
        setRecargando(false)
      }
    }
  }

  useEffect(() => {
    // cargar() se difiere un microtask para que sus setState iniciales queden
    // fuera del render del efecto (react-hooks/set-state-in-effect).
    queueMicrotask(() => { void cargar(planIdParam, tipoModalidad) })
    // Cada cambio de plan o modalidad consulta al servidor: única fuente de verdad.
  }, [planIdParam, tipoModalidad])

  /**
   * Actualiza la URL con el plan elegido manteniendo la modalidad vigente.
   * @param {string|number} planId Nuevo plan del selector.
   * @returns {void}
   */
  function elegirPlan(planId) {
    setSearchParams({ planId: String(planId), modalidad: tipoModalidad }, { replace: true })
  }

  /**
   * Cambia la modalidad tarifaria manteniendo el plan en la URL.
   * @param {string} modalidad Modalidad exacta elegida.
   * @returns {void}
   */
  function elegirModalidad(modalidad) {
    setSearchParams({ planId: String(matriz?.plan?.id ?? planIdParam ?? ''), modalidad }, { replace: true })
  }

  /**
   * Restablece los filtros del panel: vacía la búsqueda por segmento o edad,
   * vuelve a la modalidad obligatoria y al primer plan del catálogo vigente.
   * @returns {void}
   */
  function limpiarFiltros() {
    setBusqueda('')
    const primerPlan = planes?.[0]?.id
    setSearchParams(
      { planId: primerPlan != null ? String(primerPlan) : '', modalidad: MODALIDADES[0].valor },
      { replace: true },
    )
  }

  // La búsqueda opera sobre los datos reales ya cargados: no consulta ni
  // inventa segmentos que el backend no devolvió.
  const tarifasVisibles = useMemo(() => {
    const tarifas = matriz?.tarifas ?? []
    const termino = normalizar(busqueda)
    if (termino === '') return tarifas
    return tarifas.filter((tarifa) => normalizar(
      `${tarifa.rango_clave ?? ''} ${tarifa.rango_etario ?? ''} ${tarifa.rango_nota ?? ''}`,
    ).includes(termino))
  }, [matriz, busqueda])

  const ocupado = recargando || undefined
  // El selector refleja el plan de la matriz cargada; sin matriz no hay selección.
  const planSeleccionado = matriz?.plan?.id != null ? String(matriz.plan.id) : ''
  const vigencia = formatearVigencia(matriz?.version?.fecha_activacion)

  return (
    <div className="admin-directory">
      <EncabezadoContextual
        etiqueta="Módulo ADMIN · Tarifario comercial"
        titulo="Listas de precios vigentes"
        descripcion="Consultá los valores vigentes de los planes de salud por modalidad tarifaria."
        acciones={matriz ? (
          <span className="admin-vigencia">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 12l2 2 4-4"></path>
              <circle cx="12" cy="12" r="9"></circle>
            </svg>
            <span>
              Tarifas vigentes: <strong>Versión {matriz.version.id}</strong>
              {vigencia ? <> · {vigencia}</> : null}
            </span>
          </span>
        ) : null}
      />

      {aviso ? (
        <AuthAlert tone={aviso.tone} title={aviso.title}>{aviso.message}</AuthAlert>
      ) : null}

      {cargando ? (
        <LoadingState message="Cargando la matriz vigente..." />
      ) : planes?.length === 0 ? (
        <div className="admin-card admin-table-wrap">
          <p className="admin-table__empty">No hay planes activos para consultar.</p>
        </div>
      ) : (
        <>
          {/* Panel de filtros del diseño aprobado: plan, modalidad tarifaria y
              búsqueda por segmento o edad, con acción de limpieza. */}
          {planes?.length ? (
            <section className="admin-tarifario-filtros" aria-label="Filtros de la lista de precios">
              <label className="admin-campo">
                <span className="admin-campo__etiqueta">Seleccionar Plan de Salud</span>
                <select
                  aria-label="Seleccionar Plan de Salud"
                  value={planSeleccionado}
                  onChange={(event) => elegirPlan(event.target.value)}
                >
                  {(planes ?? []).map((plan) => (
                    <option key={plan.id} value={String(plan.id)}>{plan.nombre}</option>
                  ))}
                </select>
              </label>
              <label className="admin-campo">
                <span className="admin-campo__etiqueta">Modalidad Tarifaria</span>
                <select
                  aria-label="Modalidad Tarifaria"
                  value={tipoModalidad}
                  onChange={(event) => elegirModalidad(event.target.value)}
                >
                  {MODALIDADES.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>{opcion.texto}</option>
                  ))}
                </select>
              </label>
              <label className="admin-campo">
                <span className="admin-campo__etiqueta">Filtrar Segmento o Edad</span>
                <input
                  aria-label="Filtrar Segmento o Edad"
                  type="search"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Ej. Matrimonio, 40, hijo..."
                />
              </label>
              <button type="button" className="admin-button admin-button--ghost admin-tarifario-filtros__limpiar" onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            </section>
          ) : null}

          {/* Tarjeta de resultados: plan, modalidad, estado vigente y cantidad
              de segmentos sobre la tabla de precios vigentes. */}
          {matriz ? (
            <div
              className={`admin-card admin-tarifario${recargando ? ' admin-directory--actualizando' : ''}`}
              aria-busy={ocupado}
            >
              <>
                <div className="admin-tarifario__cabecera">
                  <div className="admin-tarifario__titular">
                    <h2 className="admin-tarifario__plan">{matriz.plan?.nombre}</h2>
                    <span className="admin-tarifario__modalidad">{textoModalidad(matriz.tipo_ingreso)}</span>
                    <ChipEstado estado={matriz.version.estado} />
                  </div>
                  <div className="admin-tarifario__conteo">
                    <span className="admin-tarifario__conteo-etiqueta">Total Segmentos</span>
                    <span className="admin-tarifario__conteo-valor">{tarifasVisibles.length}</span>
                  </div>
                </div>
                <div className="admin-tarifario__scroll">
                  <table className="admin-tarifario__tabla">
                    <thead>
                      <tr>
                        <th scope="col">Rango etario / Segmento tarifario</th>
                        <th scope="col" className="admin-tarifario__precio">Precio vigente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matriz.tarifas.length === 0 ? (
                        <tr><td colSpan={2} className="admin-table__empty">Sin tarifas activas para la selección.</td></tr>
                      ) : tarifasVisibles.length === 0 ? (
                        <tr><td colSpan={2} className="admin-table__empty">Sin segmentos que coincidan con la búsqueda.</td></tr>
                      ) : tarifasVisibles.map((tarifa) => (
                        <tr key={tarifa.rango_clave}>
                          <td>
                            <span className="admin-tarifario__segmento">
                              <span className="admin-tarifario__punto" aria-hidden="true" />
                              {tarifa.rango_etario}
                            </span>
                            {/* Clave y nota de la fila: datos reales del
                                tarifario que completan el segmento sin
                                reinterpretar sus valores. */}
                            <span className="admin-tarifario__detalle">
                              {tarifa.rango_clave}
                              {tarifa.rango_nota ? ` · ${tarifa.rango_nota}` : ''}
                            </span>
                          </td>
                          <td className="admin-tarifario__precio">{formatearPrecioARS(tarifa.precio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pie informativo: solo con datos disponibles de la versión. */}
                <footer className="admin-tarifario__pie">
                  {vigencia ? <span>Actualizado: {vigencia}</span> : null}
                  <span>Identificador de versión: {matriz.version.id}</span>
                  <span>{matriz.version.tipo}</span>
                </footer>
              </>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
