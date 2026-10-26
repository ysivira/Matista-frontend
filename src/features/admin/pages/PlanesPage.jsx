import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../api/adminApi.js'
import { avisoAdminPara } from '../components/avisoAdmin.js'
import { LoadingState } from '../../../shared/ui/LoadingState.jsx'
import { AuthAlert } from '../../auth/components/AuthAlert.jsx'
import { EncabezadoContextual } from '../../../shared/ui/EncabezadoContextual.jsx'
import { GemaPlan } from '../../../shared/ui/GemaPlan.jsx'
import { colorDePlan } from '../../../shared/ui/gemasPlan.js'
import { AccionesDocumento } from '../components/AccionesDocumento.jsx'
import '../../../shared/ui/documentos.css'

/**
 * Separa el detalle de un plan en su lista de líneas (una por prestación según
 * la fuente), sin interpretar ni recortar los separadores `|`: cada línea se
 * conserva íntegra para su presentación legible mientras la conversión a
 * columnas queda pendiente de aprobación.
 * @param {string|null} detalles Texto multilineal del plan.
 * @returns {string[]} Líneas no vacías del detalle, en su orden original.
 */
function lineasDeDetalles(detalles) {
  return String(detalles ?? '').split('\n').filter((linea) => linea.trim() !== '')
}

/**
 * Separa las condiciones generales del glosario de referencias: únicamente
 * cuando existe una línea que empieza con el prefijo literal `Referencias:`
 * se extrae desde esa línea hasta el final. Ningún carácter del texto se
 * reescribe, de modo que la separación es estructural y conservando el
 * significado contractual.
 * @param {string|null} condiciones Texto multilineal de condiciones generalmente.
 * @returns {{cuerpo: string, glosario: string|null}} Texto sin glosario y, si
 *   existe, la porción de glosario; en ambos casos sin líneas vacías extremas.
 */
function partirCondiciones(condiciones) {
  const lineas = String(condiciones ?? '').split('\n')
  const indiceGlosario = lineas.findIndex((linea) => linea.trim().startsWith('Referencias:'))
  if (indiceGlosario === -1) {
    return { cuerpo: String(condiciones ?? ''), glosario: null }
  }
  return {
    cuerpo: lineas.slice(0, indiceGlosario).join('\n').trim(),
    glosario: lineas.slice(indiceGlosario).join('\n').trim(),
  }
}

/**
 * Separa una línea de cobertura en sus tres campos (Prestación, Cobertura y
 * Observaciones) únicamente cuando el separador `|` delimita exactamente tres
 * partes; en cualquier otro caso conserva la línea íntegra y sin significados
 * asignados, para su presentación como «Detalle original».
 * @param {string} linea Línea verbatim del detalle del plan.
 * @returns {{celdas?: string[], original?: string}} Tres celdas recortadas en
 *   sus bordes, o el texto original completo para la fila extendida.
 */
function descomponerCobertura(linea) {
  const partes = linea.split('|')
  if (partes.length !== 3) {
    return { original: linea }
  }
  return { celdas: partes.map((parte) => parte.trim()) }
}

/**
 * Catálogo de planes activos (RF-D06, HU-ADM-03) en presentación compacta y
 * desplegable: los planes devueltos por la API se listan siempre visibles con
 * nombre, control accesible de detalles y acceso a tarifas. Los detalles y
 * condiciones generales llegan contraídos por defecto y solo un plan permanece
 * expandido a la vez. El texto recibido se preserva íntegro sin extraer ni
 * reformular coberturas, porque el separador `|` de la fuente no es consistente
 * entre planes y cualquier recorte podría alterar el significado contractual.
 * @param {object} props API de lectura y ruta base para compartir catálogo con ASESOR.
 * @returns {import('react').ReactElement} Catálogo desplegable de planes.
 */
export function PlanesPage({ api = adminApi, basePath = '/admin' }) {
  const navigate = useNavigate()
  const [planes, setPlanes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState(null)
  const [planAbierto, setPlanAbierto] = useState(null) // Único plan expandido; null = todos contraídos
  const consultaActualRef = useRef(0)

  /**
   * Consulta el catálogo vigente; las respuestas solapadas se descartan
   * por el contador vigente, igual que en el resto del módulo.
   * @returns {Promise<void>} Finaliza al aplicar el catálogo o el aviso.
   */
  const cargar = useCallback(async function cargar() {
    const consulta = consultaActualRef.current + 1
    consultaActualRef.current = consulta
    setCargando(true)
    setAviso(null)
    try {
      const respuesta = await api.listarPlanes()
      if (consulta !== consultaActualRef.current) return
      setPlanes(respuesta.planes ?? [])
    } catch (error) {
      if (consulta !== consultaActualRef.current) return
      setAviso(avisoAdminPara(error, 'No se pudo obtener el catálogo de planes. Intenta nuevamente.'))
    } finally {
      if (consulta === consultaActualRef.current) setCargando(false)
    }
  }, [api])

  useEffect(() => {
    // cargar() se difiere un microtask: sus setState iniciales quedan
    // asíncronos respecto del efecto (react-hooks/set-state-in-effect).
    queueMicrotask(cargar)
  }, [cargar])

  /**
   * Conmuta el plan expandido: abrir uno contrae el anterior y abrir el
   * mismo vuelve al estado de todos contraídos.
   * @param {number} planId Identificador del plan cuyo detalle se alterna.
   * @returns {void}
   */
  function alternarDetalles(planId) {
    setPlanAbierto((actual) => (actual === planId ? null : planId))
  }

  /**
   * Navega a la matriz de tarifas de un plan con su modalidad inicial.
   * @param {number} planId Identificador del plan seleccionado.
   * @param {string} tipoIngreso Modalidad inicial de consulta.
   * @returns {void}
   */
  function abrirTarifario(planId, tipoIngreso) {
    navigate(`${basePath === '/admin' ? '/admin/tarifario' : '/asesor/precios'}?planId=${planId}&modalidad=${encodeURIComponent(tipoIngreso)}`)
  }

  return (
    <div className="admin-directory">
      <EncabezadoContextual
        etiqueta={`${basePath === '/admin' ? 'Módulo ADMIN' : 'Módulo ASESOR'} · Catálogo oficial`}
        titulo="Catálogo de planes"
        descripcion="Consultá los planes activos publicados en el tarifario."
      />

      {aviso ? (
        <AuthAlert tone={aviso.tone} title={aviso.title}>{aviso.message}</AuthAlert>
      ) : null}

      {cargando ? (
        <LoadingState message="Cargando el catálogo de planes..." />
      ) : planes.length === 0 ? (
        <div className="admin-card admin-plan-card">
          <p className="admin-plan-card__empty">No hay planes activos.</p>
        </div>
      ) : (
        <>
          {/* Rejilla de tarjetas compactas del catálogo aprobado: gema, nombre
              y acciones de ADMIN por plan; el plan abierto recibe el anillo
              violeta de selección. La ficha técnica vive inmediatamente
              debajo, no dentro de la tarjeta, como el diseño aprobado. */}
          <div className="admin-plan-lista">
            {planes.map((plan) => {
              const abierto = planAbierto === plan.id
              return (
                <article key={plan.id} className={`admin-card admin-plan-card${abierto ? ' admin-plan-card--abierto' : ''}`}>
                  <div className="admin-plan-card__header">
                    <span className="admin-plan-card__gema">
                      <GemaPlan nombre={plan.nombre} />
                    </span>
                    <h2 className="admin-plan-card__nombre">{plan.nombre}</h2>
                    <div className="admin-plan-card__acciones">
                      <button
                        type="button"
                        className="admin-button admin-button--ghost"
                        aria-expanded={abierto}
                        aria-controls={`plan-${plan.id}-detalles`}
                        onClick={() => alternarDetalles(plan.id)}
                      >
                        {abierto ? 'Ocultar detalles' : 'Ver detalles'}
                      </button>
                      <button
                        type="button"
                        className="admin-button admin-button--subtle admin-button--wide"
                        onClick={() => abrirTarifario(plan.id, 'Obligatorio')}
                      >
                        Ver tarifas
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
          {/* Fichas técnicas (una por plan, solo la elegida visible): los
              paneles conservan el contrato accesible de tarjetas SL-2E con
              `hidden` por plan y `aria-controls` en la tarjeta que los abre.
              El grupo se separa de la rejilla con aire suficiente para leer
              la ficha como bloque propio. */}
          <div className="admin-plan-fichas">
            {planes.map((plan) => {
              const abierto = planAbierto === plan.id
              return (
                <section key={plan.id} id={`plan-${plan.id}-detalles`} hidden={!abierto} className={`admin-card admin-plan-card__body${abierto ? ' matista-print' : ''}`} style={{ borderTop: `4px solid ${colorDePlan(plan.nombre)}` }}>
                  <div className="admin-plan-card__titular">
                    <span className="admin-plan-card__gema">
                      <GemaPlan nombre={plan.nombre} tamano="ficha" />
                    </span>
                    <h3 className="admin-plan-card__encabezado">{plan.nombre}</h3>
                  </div>
                  <AccionesDocumento recurso={`planes/${plan.id}`} etiquetaImprimir="Imprimir detalle" etiquetaPdf="Exportar PDF del plan" />
                  <h3 className="admin-plan-card__subtitulo">Coberturas</h3>
                  {/* Tabla semántica de coberturas: los registros con tres campos
                      delimitados por `|` se separan en celdas; los registros
                      ambiguos conservan su texto íntegro en una fila extendida
                      con la indicación «Detalle original», sin inventar
                      correspondencias. `NO` y las abreviaturas quedan literales. */}
                  {(() => {
                    const filas = lineasDeDetalles(plan.detalles).map(descomponerCobertura)
                    return filas.length > 0 ? (
                      <table className="admin-plan-tabla">
                        <caption className="admin-plan-tabla__captura">
                          Coberturas del plan {plan.nombre}
                        </caption>
                        {/* Proporciones de columna definidas en admin.css con
                            layout fijo: prestación más ancha y campos de
                            cobertura/observación equivalentes. */}
                        <colgroup>
                          <col />
                          <col />
                          <col />
                        </colgroup>
                        <thead>
                          <tr>
                            <th scope="col">Prestación</th>
                            <th scope="col">Cobertura</th>
                            <th scope="col">Observaciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filas.map((fila, indice) => (
                            fila.celdas ? (
                              <tr key={indice}>
                                {/* Punto de color del plan junto a la prestación
                                    y píldora de fondo violeta para la cobertura:
                                    lenguaje visual del catálogo aprobado. */}
                                <td data-label="Prestación">
                                  <span className="admin-plan-tabla__bullet" style={{ background: colorDePlan(plan.nombre) }} aria-hidden="true" />
                                  {fila.celdas[0]}
                                </td>
                                <td data-label="Cobertura">
                                  <span className="admin-plan-tabla__cobertura">{fila.celdas[1]}</span>
                                </td>
                                <td data-label="Observaciones">{fila.celdas[2]}</td>
                              </tr>
                            ) : (
                              <tr key={indice} className="admin-plan-tabla__fila-completa">
                                <td colSpan={3}>
                                  <span className="admin-plan-tabla__etiqueta">Detalle original</span>
                                  {fila.original}
                                </td>
                              </tr>
                            )
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="admin-plan-card__texto">—</p>
                    )
                  })()}
                  <h3 className="admin-plan-card__subtitulo">Condiciones generales</h3>
                  {(() => {
                    const { cuerpo, glosario } = partirCondiciones(plan.condiciones_generales)
                    return (
                      <>
                        <p className="admin-plan-card__texto">{cuerpo !== '' ? cuerpo : '—'}</p>
                        {glosario !== null ? (
                          <div className="admin-plan-card__glosario">
                            <h4 className="admin-plan-card__subtitulo">Glosario de referencias</h4>
                            <p className="admin-plan-card__texto admin-plan-card__texto--glosario">{glosario}</p>
                          </div>
                        ) : null}
                      </>
                    )
                  })()}
                </section>
              )
            })}
          </div>
        </>
      )}

      <p className="admin-directory__hint">
        Consultá las tarifas actualizadas de cada plan en Gestión de Precios.
      </p>
    </div>
  )
}
