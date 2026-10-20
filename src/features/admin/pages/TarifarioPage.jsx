import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi } from '../api/adminApi.js'
import { avisoAdminPara } from '../components/avisoAdmin.js'
import { formatearPrecioARS } from '../components/formatoMonetario.js'
import { ChipEstado } from '../components/ChipEstado.jsx'
import { LoadingState } from '../../../shared/ui/LoadingState.jsx'
import { AuthAlert } from '../../auth/components/AuthAlert.jsx'

/** Modalidades de ingreso exactas definidas por el contrato SL-2. */
const MODALIDADES = Object.freeze(['Obligatorio', 'Voluntario'])
/** Anchuras fijas del colgroup de la matriz para mantener la lectura uniforme. */
const ANCHOS_COLGADOS = ['24%', '26%', '28%', '22%']

/**
 * Pantalla de Gestión de Precios (RF-D07, HU-ADM-04): consulta la matriz de
 * tarifas activas de la versión vigente seleccionando plan y modalidad.
 * El plan inicial llega por URL como enlace profundo; el selector y las
 * pestañas actualizan la consulta y la URL sin recargar el shell.
 * @returns {import('react').ReactElement} Matriz vigente con cabecera de versión.
 */
export function TarifarioPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const planIdParam = searchParams.get('planId')
  const modalidadParam = searchParams.get('modalidad')
  const tipoModalidad = MODALIDADES.includes(modalidadParam) ? modalidadParam : 'Obligatorio'

  const [planes, setPlanes] = useState(null) // null: catálogo aún no consultado
  const [matriz, setMatriz] = useState(null) // { plan, tipo_ingreso, version, tarifas }
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
    // Cada cambio de plan o pestaña consulta al servidor: única fuente de verdad.
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
   * Cambia la pestaña de modalidad manteniendo el plan en la URL.
   * @param {string} modalidad Modalidad exacta elegida.
   * @returns {void}
   */
  function elegirModalidad(modalidad) {
    setSearchParams({ planId: String(matriz?.plan?.id ?? planIdParam ?? ''), modalidad }, { replace: true })
  }

  const ocupado = recargando || undefined
  // El selector refleja el plan de la matriz cargada; sin matriz no hay selección.
  const planSeleccionado = matriz?.plan?.id != null ? String(matriz.plan.id) : ''

  return (
    <div className="admin-directory">
      <p className="admin-directory__descripcion">Consultá la matriz de tarifas de la versión vigente por plan y modalidad.</p>

      <div className="admin-directory__toolbar">
        <section className="admin-filters" aria-label="Selección del tarifario">
          <label className="admin-field">
            Plan
            <select
              aria-label="Plan del tarifario"
              value={planSeleccionado}
              onChange={(event) => elegirPlan(event.target.value)}
            >
              {(planes ?? []).length === 0 ? <option value="">—</option> : planes.map((plan) => (
                <option key={plan.id} value={String(plan.id)}>{plan.nombre}</option>
              ))}
            </select>
          </label>
        </section>
        <div className="admin-tabs" role="group" aria-label="Modalidad de ingreso">
          {MODALIDADES.map((modalidad) => (
            <button
              key={modalidad}
              type="button"
              className={`admin-tab${modalidad === tipoModalidad ? ' admin-tab--activa' : ''}`}
              aria-pressed={modalidad === tipoModalidad}
              onClick={() => elegirModalidad(modalidad)}
            >
              {modalidad}
            </button>
          ))}
        </div>
      </div>

      {aviso ? (
        <AuthAlert tone={aviso.tone} title={aviso.title}>{aviso.message}</AuthAlert>
      ) : null}

      {cargando ? (
        <LoadingState message="Cargando la matriz vigente..." />
      ) : matriz ? (
        <div
          className={`admin-card admin-table-wrap${recargando ? ' admin-directory--actualizando' : ''}`}
          aria-busy={ocupado}
        >
          <div className="admin-version-meta">
            <span>Versión {matriz.version.id} · {matriz.version.tipo}</span>
            <ChipEstado estado={matriz.version.estado} />
            <span>Activación: {new Date(matriz.version.fecha_activacion).toLocaleString()}</span>
            <span>{matriz.tipo_ingreso}</span>
          </div>
          <div className="admin-table__scroll">
            <table className="admin-table">
              <colgroup>
                {ANCHOS_COLGADOS.map((ancho) => <col key={ancho} style={{ width: ancho }} />)}
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Rango clave</th>
                  <th scope="col">Rango etario</th>
                  <th scope="col">Nota</th>
                  <th scope="col" className="admin-table__precio">Precio</th>
                </tr>
              </thead>
              <tbody>
                {matriz.tarifas.length === 0 ? (
                  <tr><td colSpan={4} className="admin-table__empty">Sin tarifas activas para la selección.</td></tr>
                ) : matriz.tarifas.map((tarifa) => (
                  <tr key={tarifa.rango_clave}>
                    <td>{tarifa.rango_clave}</td>
                    <td className="admin-table__texto">{tarifa.rango_etario}</td>
                    <td className="admin-table__texto">{tarifa.rango_nota ?? '—'}</td>
                    <td className="admin-table__precio">{formatearPrecioARS(tarifa.precio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : planes?.length === 0 ? (
        <div className="admin-card admin-table-wrap">
          <p className="admin-table__empty">No hay planes activos para consultar.</p>
        </div>
      ) : null}
    </div>
  )
}
