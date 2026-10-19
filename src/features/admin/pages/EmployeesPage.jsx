import { useEffect, useState } from 'react'
import { adminApi } from '../api/adminApi.js'
import { useSession } from '../../auth/hooks/useSession.js'
import { ApiError } from '../../../shared/lib/httpClient.js'
import { technicalNoticeFor } from '../../auth/auth.messages.js'
import { LoadingState } from '../../../shared/ui/LoadingState.jsx'
import { AuthAlert } from '../../auth/components/AuthAlert.jsx'
import { AdminAvatar } from '../components/AdminAvatar.jsx'
import { inicialesDe } from '../components/iniciales.js'
import { AdminModal, IconoAdvertencia, IconoCheck, IconoLupa } from '../components/AdminModal.jsx'
import { ChipEstado } from '../components/ChipEstado.jsx'
import { EmployeeCard, MenuRolEmpleados } from '../components/EmployeeCard.jsx'
import { useVistaTarjetas } from '../hooks/useVistaTarjetas.js'

const ESTADOS_FILTRO = ['todos', 'PENDIENTE', 'ACTIVO', 'INACTIVO', 'BAJA']
const ROLES_FILTRO = ['todos', 'ADMIN', 'ASESOR']

const ETIQUETA_ACCION = Object.freeze({
  activar: 'activar',
  desactivar: 'desactivar',
  darBaja: 'dar de baja',
  reactivar: 'reactivar',
  promover: 'promover a ADMIN',
  degradar: 'cambiar a ASESOR',
})

/** Estado destino de cada acción aprobada en la matriz SL-1. */
const DESTINO_ACCION = Object.freeze({
  activar: 'ACTIVO',
  reactivar: 'ACTIVO',
  desactivar: 'INACTIVO',
  darBaja: 'BAJA',
})

/** Trazo del icono de acción por estado según la matriz SL-1 (solo estado, sin edición). */
const ICONOS_ACCION = Object.freeze({
  activar: 'M9 12l2 2 4-4M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
  desactivar: 'M4 4l16 16M10 5.3A7.4 7.4 0 0 1 12 5c4.4 0 8 3.1 8 7 0 1-.3 2-.8 2.9M6.3 7.4C5 8.6 4 10.2 4 12c0 3.9 3.6 7 8 7 1.4 0 2.7-.3 3.8-.9',
  reactivar: 'M4 4v6h6M20 20v-6h-6M20 9A8 8 0 0 0 6 6M4 15a8 8 0 0 0 14 3',
  darBaja: 'M5 8h14M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-1 11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1L7 8',
})

/**
 * Traduce los códigos de negocio del backend a avisos sin exponer datos sensibles.
 * @param {unknown} error Error del cliente HTTP.
 * @param {string} [fallback] Mensaje para fallos técnicos.
 * @returns {{title: string, message: string, tone: string}} Aviso accesible.
 */
function avisoPara(error, fallback = 'No se pudo completar la operación. Intenta nuevamente.') {
  const codigosNegocio = [
    'ADMIN_TRANSICION', 'ULTIMO_ADMIN_PROTEGIDO',
    'OPERACION_PROPIA_NO_PERMITIDA', 'ADMIN_NO_ENCONTRADO',
    'ADMIN_VALIDACION', 'ADMIN_ESTADO', 'SESSION_INVALID', 'ROLE_FORBIDDEN',
  ]
  if (error instanceof ApiError && error.code && codigosNegocio.includes(error.code)) {
    return { tone: 'error', title: 'El directorio rechazó la operación', message: error.message }
  }
  return technicalNoticeFor(error, fallback)
}

/**
 * Confirma la transición pendiente con la tarjeta del empleado y la caja
 * CAMBIO DE ESTADO del diseño Stitch. Solo presenta; la regla vive en el
 * servidor y la operación se audita en el mismo registro de la operación.
 * @param {{accion: string, destino?: string, empleado: object, detalle: (?object), submitting: boolean, onClose: () => void, onConfirm: () => void}} props Acción elegida.
 * @returns {import('react').ReactElement} Modal de confirmación activo.
 */
function ModalAccion({ accion, destino, empleado, detalle, submitting, onClose, onConfirm }) {
  const esRol = accion === 'promover' || accion === 'degradar'
  const restrictivo = accion === 'desactivar' || accion === 'darBaja'
  // El detalle llega por la petición getEmployee; hasta que llegue se usa la fila.
  const visible = detalle ?? empleado
  return (
    <AdminModal
      label={`Confirmar ${ETIQUETA_ACCION[accion]}`}
      title={`Confirmar ${ETIQUETA_ACCION[accion]}`}
      subtitle="Confirmación de cambio de cuenta"
      tone={restrictivo ? 'danger' : 'primary'}
      icon={<IconoAdvertencia />}
      onClose={onClose}
      footer={(
        <>
          <button className="admin-button admin-button--ghost" type="button" disabled={submitting} onClick={onClose}>
            Cancelar
          </button>
          <button
            className={`admin-button ${restrictivo ? 'admin-button--danger' : ''}`}
            type="button"
            disabled={submitting}
            onClick={onConfirm}
          >
            {submitting ? 'Procesando...' : `Confirmar ${ETIQUETA_ACCION[accion]}`}
          </button>
        </>
      )}
    >
      <div className="admin-employee-card">
        <AdminAvatar iniciales={inicialesDe(visible)} />
        <div>
          <span className="admin-employee-card__name">{[visible.nombre, visible.apellido].filter(Boolean).join(' ')}</span>
          <span className="admin-employee-card__meta">{visible.legajo} · {visible.email ?? '—'}</span>
        </div>
        <span className="admin-employee-card__state"><ChipEstado estado={visible.estado} /></span>
      </div>

      {esRol ? (
        <div className="admin-transition">
          <span className="admin-transition__label">Cambio de rol</span>
          <div className="admin-transition__row">
            <span className="admin-chip admin-chip--asesor">{accion === 'promover' ? 'ASESOR' : 'ADMIN'}</span>
            <span className="admin-transition__arrow" aria-hidden="true">→</span>
            <span className="admin-chip admin-chip--admin">{accion === 'promover' ? 'ADMIN' : 'ASESOR'}</span>
          </div>
        </div>
      ) : (
        <div className="admin-transition">
          <span className="admin-transition__label">Cambio de estado</span>
          <div className="admin-transition__row">
            <ChipEstado estado={visible.estado} />
            <span className="admin-transition__arrow" aria-hidden="true">→</span>
            <ChipEstado estado={destino} />
          </div>
        </div>
      )}

      {!esRol && destino !== 'ACTIVO' ? (
        <p className="admin-modal__lead">¿Confirmas el cambio? Se cerrarán todas las sesiones activas de la cuenta.</p>
      ) : (
        <p className="admin-modal__lead">¿Confirmas la operación? Se auditará en el mismo registro de la operación.</p>
      )}
    </AdminModal>
  )
}

/**
 * Aviso de éxito centrado del diseño Stitch tras aplicar un cambio de estado o rol.
 * @param {{empleado: object, estadoFinal: string, mensaje: string, onCerrar: () => void}} props Estado logrado.
 * @returns {import('react').ReactElement} Modal de confirmación de éxito.
 */
function ModalExito({ empleado, estadoFinal, mensaje, onCerrar }) {
  return (
    <AdminModal
      label="Estado actualizado"
      title="Estado actualizado"
      tone="success"
      icon={<IconoCheck />}
      center
      footer={(
        <button className="admin-button admin-button--wide" type="button" onClick={onCerrar}>
          Entendido
        </button>
      )}
    >
      <p className="admin-modal__lead">{mensaje}</p>
      {empleado ? (
        <div className="admin-employee-card admin-employee-card--center">
          <AdminAvatar iniciales={inicialesDe(empleado)} />
          <div>
            <span className="admin-employee-card__name">{[empleado.nombre, empleado.apellido].filter(Boolean).join(' ')}</span>
            <span className="admin-employee-card__meta">{empleado.legajo}</span>
          </div>
          <span className="admin-employee-card__state"><ChipEstado estado={estadoFinal} /></span>
        </div>
      ) : null}
    </AdminModal>
  )
}

/**
 * Directorio de empleados del módulo ADMIN: listado, filtros, búsqueda,
 * detalle y acciones de estado/rol con confirmación. Toda regla vive en el
 * servidor; esta pantalla solo muestra y envía los DTO del contrato.
 * @returns {import('react').ReactElement} Directorio vigilado por backend.
 */
export function EmployeesPage() {
  const { user } = useSession()
  const vistaTarjetas = useVistaTarjetas()
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState(null)
  const [filtros, setFiltros] = useState({ estado: 'todos', rol: 'todos', busqueda: '' })
  const [detalle, setDetalle] = useState(null)
  const [accionPendiente, setAccionPendiente] = useState(null) // { accion, empleado }
  const [submitting, setSubmitting] = useState(false)
  const [actualizado, setActualizado] = useState(null) // { empleado, estadoFinal, mensaje }
  const [menuRol, setMenuRol] = useState(null) // Legajo con el menú de rol abierto

  /**
   * Recarga el listado con los filtros actuales; fallo técnico con aviso reintentable.
   * @returns {Promise<void>} Finaliza al aplicar el listado o el aviso.
   */
  async function cargar() {
    setCargando(true)
    setAviso(null)
    try {
      const respuesta = await adminApi.listEmployees(filtros)
      setEmpleados(respuesta.empleados ?? [])
    } catch (error) {
      setAviso(avisoPara(error, 'No se pudo obtener el directorio. Intenta nuevamente.'))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    // cargar() se difiere un microtask: sus setState iniciales quedan asíncronos
    // respecto del efecto (react-hooks/set-state-in-effect) tras la consulta al backend.
    queueMicrotask(cargar)
    // La carga inicial y los cambios de filtros disparan la única fuente de verdad: el backend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.estado, filtros.rol])

  useEffect(() => {
    // El menú contextual de rol se cierra con cualquier interacción fuera de él.
    if (!menuRol) return undefined
    function cerrarMenu(evento) {
      if (!evento.target.closest?.('.admin-menu__wrap')) setMenuRol(null)
    }
    document.addEventListener('mousedown', cerrarMenu)
    return () => document.removeEventListener('mousedown', cerrarMenu)
  }, [menuRol])

  /**
   * Abre el modal de confirmación para la acción elegida sobre el empleado.
   * @param {string} accion Clave de la acción aprobada.
   * @param {object} empleado Fila del directorio seleccionada.
   * @returns {void}
   */
  function pedirConfirmacion(accion, empleado) {
    setAviso(null)
    setActualizado(null)
    setDetalle(null)
    setAccionPendiente({ accion, empleado })
    void adminApi.getEmployee(empleado.legajo).then((respuesta) => setDetalle(respuesta.empleado ?? empleado)).catch(() => setDetalle(empleado))
  }

  /**
   * Normaliza los nombres para la celda principal del directorio.
   * @param {object} empleado Fila pública del backend.
   * @returns {string} Nombre completo con espacios limpios.
   */
  function nombreCompleto(empleado) {
    return [empleado.nombre, empleado.segundo_nombre, empleado.apellido, empleado.segundo_apellido]
      .filter(Boolean).join(' ') || '—'
  }

  /**
   * Determina si la fila pertenece a la propia cuenta operante; el backend también lo prohibe.
   * @param {object} empleado Fila del directorio.
   * @returns {boolean} True cuando es la propia cuenta.
   */
  function esPropia(empleado) {
    return user?.legajo === empleado.legajo
  }

  /**
   * Confirma la acción pendiente contra la API y anima la recarga del directorio.
   * @returns {Promise<void>} Finaliza aplicando el nuevo estado o el aviso de rechazo.
   */
  async function confirmar() {
    if (!accionPendiente) return
    const { accion, empleado } = accionPendiente
    setSubmitting(true)
    try {
      if (accion === 'promover' || accion === 'degradar') {
        await adminApi.changeRol(empleado.legajo, accion === 'promover' ? 'ADMIN' : 'ASESOR')
        setAccionPendiente(null)
        setDetalle(null)
        setActualizado({
          empleado: detalle,
          estadoFinal: accion === 'promover' ? 'ADMIN' : 'ASESOR',
          mensaje: accion === 'promover'
            ? 'La cuenta cambió de rol y se actualizará el directorio para las próximas sesiones.'
            : 'La cuenta cambió a ASESOR y el directorio se recargó con el nuevo rol.',
        })
      } else {
        await adminApi.changeEstado(empleado.legajo, DESTINO_ACCION[accion])
        setAccionPendiente(null)
        setDetalle(null)
        setActualizado({
          empleado: detalle,
          estadoFinal: DESTINO_ACCION[accion],
          mensaje: 'El directorio se recargó con la cuenta actualizada.',
        })
      }
      await cargar()
    } catch (error) {
      setAccionPendiente(null)
      setDetalle(null)
      setAviso(avisoPara(error))
    } finally {
      setSubmitting(false)
    }
  }

  /** Acciones de estado disponibles por estado, con icono y etiqueta accesible. */
  function accionesDe(empleado) {
    if (esPropia(empleado)) return []
    switch (empleado.estado) {
      case 'PENDIENTE': return [{ accion: 'activar', label: 'Activar' }]
      case 'ACTIVO': return [{ accion: 'desactivar', label: 'Desactivar' }, { accion: 'darBaja', label: 'Dar baja' }]
      case 'INACTIVO': return [{ accion: 'reactivar', label: 'Reactivar' }, { accion: 'darBaja', label: 'Dar baja' }]
      default: return []
    }
  }

  /**
   * Decide la acción de rol disponible para la fila activa con el rol contrario.
   * @param {object} empleado Fila ACTIVO del directorio.
   * @returns {object} Acción de rol o null.
   */
  function accionRolDe(empleado) {
    if (esPropia(empleado) || empleado.estado !== 'ACTIVO') return null
    return empleado.rol === 'ADMIN'
      ? { accion: 'degradar', label: 'Cambiar a ASESOR' }
      : { accion: 'promover', label: 'Promover a ADMIN' }
  }

  return (
    <div className="admin-directory">
      <div className="admin-directory__lead">
        <h1 className="admin-title">Directorio de empleados</h1>
        <p>Activa, desactiva y da de baja cuentas; cambia roles con auditoría en el servidor.</p>
      </div>

      <div className="admin-directory__toolbar">
        <div className="admin-search" aria-label="Buscador del directorio">
          <IconoLupa />
          <label className="admin-field admin-field--search">
            <span className="admin-visually-hidden">Búsqueda</span>
            <input
              type="search"
              placeholder="Buscar"
              value={filtros.busqueda}
              onChange={(event) => setFiltros((actual) => ({ ...actual, busqueda: event.target.value }))}
              onKeyDown={(event) => { if (event.key === 'Enter') void cargar() }}
            />
          </label>
          <button className="admin-button admin-button--subtle" type="button" onClick={() => void cargar()}>
            Buscar
          </button>
        </div>
        <section className="admin-filters" aria-label="Filtros del directorio">
          <label className="admin-field">
            Estado
            <select value={filtros.estado} onChange={(event) => setFiltros((actual) => ({ ...actual, estado: event.target.value }))}>
              {ESTADOS_FILTRO.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
            </select>
          </label>
          <label className="admin-field">
            Rol
            <select value={filtros.rol} onChange={(event) => setFiltros((actual) => ({ ...actual, rol: event.target.value }))}>
              {ROLES_FILTRO.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
            </select>
          </label>
        </section>
      </div>

      {aviso ? (
        <AuthAlert tone={aviso.tone} title={aviso.title}>{aviso.message}</AuthAlert>
      ) : null}

      {cargando ? (
        <LoadingState message="Cargando el directorio..." />
      ) : vistaTarjetas ? (
        <section className="admin-card admin-directory-cards" aria-label="Tarjetas del directorio">
          {empleados.length === 0 ? (
            <p className="admin-directory-card__empty">No hay empleados con esos filtros.</p>
          ) : (
            <div className="admin-directory-cards__grid">
              {empleados.map((empleado) => (
                <EmployeeCard
                  key={empleado.legajo}
                  empleado={empleado}
                  nombreMostrado={nombreCompleto(empleado)}
                  acciones={accionesDe(empleado).map(({ accion, label }) => ({ accion, label, icono: ICONOS_ACCION[accion] }))}
                  accionRol={accionRolDe(empleado)}
                  menuAbierto={menuRol === empleado.legajo}
                  onMenuRol={() => setMenuRol(menuRol === empleado.legajo ? null : empleado.legajo)}
                  onPedirAccion={pedirConfirmacion}
                  onElegirRol={(accion, elegido) => { setMenuRol(null); pedirConfirmacion(accion, elegido) }}
                  onVerDetalle={() => { void adminApi.getEmployee(empleado.legajo).then((r) => setDetalle(r.empleado)).catch(() => {}) }}
                />
              ))}
            </div>
          )}
          <div className="admin-card__footer">
            <span>Página única del directorio</span>
            <span>Mostrando {empleados.length} de {empleados.length} empleados</span>
          </div>
        </section>
      ) : (
        <div className="admin-card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Empleado</th>
                <th scope="col">Legajo</th>
                <th scope="col">Contacto</th>
                <th scope="col">Rol</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empleados.length === 0 ? (
                <tr><td colSpan={6} className="admin-table__empty">No hay empleados con esos filtros.</td></tr>
              ) : empleados.map((empleado) => (
                <tr key={empleado.legajo}>
                  <td>
                    <div className="admin-table__employee">
                      <AdminAvatar iniciales={inicialesDe(empleado)} pequeno />
                      <div>
                        <button
                          className="admin-table__name"
                          type="button"
                          onClick={() => { void adminApi.getEmployee(empleado.legajo).then((r) => setDetalle(r.empleado)).catch(() => {}) }}
                        >
                          {nombreCompleto(empleado)}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="admin-table__legajo">{empleado.legajo}</td>
                  <td className="admin-table__email">{empleado.email ?? '—'}</td>
                  <td><span className={`admin-chip admin-chip--${empleado.rol === 'ADMIN' ? 'admin' : 'asesor'}`}>{empleado.rol}</span></td>
                  <td><ChipEstado estado={empleado.estado} /></td>
                  <td>
                    <div className="admin-table__actions">
                      {accionesDe(empleado).map(({ accion, label }) => (
                        <button
                          key={accion}
                          className="admin-icon-button"
                          type="button"
                          aria-label={label}
                          title={label}
                          onClick={() => pedirConfirmacion(accion, empleado)}
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d={ICONOS_ACCION[accion]} />
                          </svg>
                        </button>
                      ))}
                      <MenuRolEmpleados
                        empleado={empleado}
                        nombreMostrado={nombreCompleto(empleado)}
                        accionRol={accionRolDe(empleado)}
                        abierto={menuRol === empleado.legajo}
                        onToggle={() => setMenuRol(menuRol === empleado.legajo ? null : empleado.legajo)}
                        onElegir={(accion, elegido) => { setMenuRol(null); pedirConfirmacion(accion, elegido) }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="admin-card__footer">
            <span>Página única del directorio</span>
            <span>Mostrando {empleados.length} de {empleados.length} empleados</span>
          </div>
        </div>
      )}

      <p className="admin-directory__hint">
        La propia cuenta no se administra desde el directorio: operá los cambios desde la tarjeta de usuario al pie de la barra lateral.
      </p>

      {detalle && !accionPendiente ? (
        <AdminModal
          label="Detalle del empleado"
          title="Detalle del empleado"
          subtitle="Datos públicos del registro"
          tone="primary"
          icon={<span className="admin-avatar admin-avatar--small" aria-hidden="true">{inicialesDe(detalle).slice(0, 2).toUpperCase() || '—'}</span>}
          onClose={() => setDetalle(null)}
          footer={(
            <>
              {detalle.estado === 'ACTIVO' && !esPropia(detalle) && accionRolDe(detalle) ? (
                <button
                  className="admin-button admin-button--ghost"
                  type="button"
                  onClick={() => { setDetalle(null); setActualizado(null); setAccionPendiente({ accion: accionRolDe(detalle).accion, empleado: detalle }) }}
                >
                  {accionRolDe(detalle).label}
                </button>
              ) : null}
              <button className="admin-button" type="button" onClick={() => setDetalle(null)}>Cerrar</button>
            </>
          )}
        >
          <div className="admin-employee-card">
            <AdminAvatar iniciales={inicialesDe(detalle)} />
            <div>
              <span className="admin-employee-card__name">{nombreCompleto(detalle)}</span>
              <span className="admin-employee-card__meta">{detalle.email ?? '—'}</span>
            </div>
            <span className="admin-employee-card__state"><ChipEstado estado={detalle.estado} /></span>
          </div>
          <dl className="admin-facts">
            <div><dt>Legajo</dt><dd>{detalle.legajo}</dd></div>
            <div><dt>Teléfono</dt><dd>{detalle.telefono ?? '—'}</dd></div>
            <div><dt>Rol</dt><dd>{detalle.rol}</dd></div>
            <div><dt>Estado</dt><dd>{detalle.estado}</dd></div>
          </dl>
        </AdminModal>
      ) : null}

      {accionPendiente ? (
        <ModalAccion
          accion={accionPendiente.accion}
          destino={DESTINO_ACCION[accionPendiente.accion]}
          empleado={accionPendiente.empleado}
          detalle={detalle}
          submitting={submitting}
          onClose={() => { setAccionPendiente(null); setDetalle(null) }}
          onConfirm={() => void confirmar()}
        />
      ) : null}

      {actualizado ? (
        <ModalExito
          empleado={actualizado.empleado}
          estadoFinal={actualizado.estadoFinal}
          mensaje={actualizado.mensaje}
          onCerrar={() => setActualizado(null)}
        />
      ) : null}
    </div>
  )
}
