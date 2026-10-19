import { useEffect, useState } from 'react'
import { adminApi } from '../api/adminApi.js'
import { useSession } from '../../auth/hooks/useSession.js'
import { ApiError } from '../../../shared/lib/httpClient.js'
import { technicalNoticeFor } from '../../auth/auth.messages.js'
import { LoadingState } from '../../../shared/ui/LoadingState.jsx'
import { AuthAlert } from '../../auth/components/AuthAlert.jsx'

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
 * Representa el círculo principal de acciones de la cuenta ya activa.
 * @param {string} accion Acción solicitada.
 * @param {string} destino Estado destino.
 * @param {import('react').ReactNode} children Contenido del modal.
 * @returns {import('react').ReactElement} Modal activo de confirmación.
 */
function ModalAccion({ accion, destino, onClose, onConfirm, submitting, detalle }) {
  const esRol = accion === 'promover' || accion === 'degradar'
  return (
    <div className="admin-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Confirmar ${ETIQUETA_ACCION[accion]}`}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="admin-modal__title">{`Confirmar ${ETIQUETA_ACCION[accion]}`}</h2>
        <p className="admin-modal__lead">{`${ETIQUETA_ACCION[accion]}: se auditará en el mismo registro de la operación.`}</p>
        {detalle ? (
          <dl className="admin-modal__facts">
            <div><dt>Empleado</dt><dd>{[detalle.nombre, detalle.apellido].filter(Boolean).join(' ')}</dd></div>
            <div><dt>Legajo</dt><dd>{detalle.legajo}</dd></div>
            {esRol ? (
              <div><dt>Rol viejo a nuevo</dt><dd>{accion === 'promover' ? 'ASESOR → ADMIN' : 'ADMIN → ASESOR'}</dd></div>
            ) : (
              <div><dt>Estado destino</dt><dd>{destino}</dd></div>
            )}
            {!esRol && destino !== 'ACTIVO' ? (
              <div><dt>Sesiones activas</dt><dd>Se cerrarán todas al confirmar.</dd></div>
            ) : null}
          </dl>
        ) : null}
        <div className="admin-modal__actions">
          <button className="admin-button admin-button--ghost" type="button" disabled={submitting} onClick={onClose}>
            Cancelar
          </button>
          <button className="admin-button" type="button" disabled={submitting} onClick={onConfirm}>
            {submitting ? 'Procesando...' : `Confirmar ${ETIQUETA_ACCION[accion]}`}
          </button>
        </div>
      </div>
    </div>
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
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState(null)
  const [filtros, setFiltros] = useState({ estado: 'todos', rol: 'todos', busqueda: '' })
  const [detalle, setDetalle] = useState(null)
  const [accionPendiente, setAccionPendiente] = useState(null) // { accion, empleado }
  const [submitting, setSubmitting] = useState(false)
  const [actualizado, setActualizado] = useState(null)

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
    void cargar()
    // La carga inicial y los cambios de filtros disparan la única fuente de verdad: el backend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.estado, filtros.rol])

  /**
   * Abre el modal de confirmación para la acción elegida sobre el empleado.
   * @param {string} accion Clave de la acción aprobada.
   * @param {object} empleado Fila del directorio seleccionada.
   * @returns {void}
   */
  function pedirConfirmacion(accion, empleado) {
    setAviso(null)
    setActualizado(null)
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
      } else {
        await adminApi.changeEstado(empleado.legajo, DESTINO_ACCION[accion])
      }
      setAccionPendiente(null)
      setActualizado({
        titulo: 'Estado actualizado',
        mensaje: accion === 'promover'
          ? 'La cuenta operante cambió de rol. Actualizamos el directorio con su nuevo rol para las próximas sesiones.'
          : 'El directorio se recargó con la cuenta actualizada.',
      })
      await cargar()
    } catch (error) {
      setAccionPendiente(null)
      setAviso(avisoPara(error))
    } finally {
      setSubmitting(false)
    }
  }

  /** Acciones de estado disponibles por estado, etiquetadas para el directorio. */
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
      <div className="admin-directory__header">
        <div>
          <h1 className="admin-title">Directorio de empleados</h1>
          <p className="admin-directory__lead">
            Activa, desactiva y da de baja cuentas; cambia roles con auditoría en el servidor.
          </p>
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
          <label className="admin-field admin-field--search">
            Búsqueda
            <input
              type="search"
              placeholder="Legajo, nombre o correo"
              value={filtros.busqueda}
              onChange={(event) => setFiltros((actual) => ({ ...actual, busqueda: event.target.value }))}
              onKeyDown={(event) => { if (event.key === 'Enter') void cargar() }}
            />
          </label>
          <button className="admin-button admin-button--subtle" type="button" onClick={() => void cargar()}>
            Buscar
          </button>
        </section>
      </div>

      {actualizado ? (
        <AuthAlert tone="success" title={actualizado.titulo}>{actualizado.mensaje}</AuthAlert>
      ) : null}
      {aviso ? (
        <AuthAlert tone={aviso.tone} title={aviso.title}>{aviso.message}</AuthAlert>
      ) : null}

      {cargando ? (
        <LoadingState message="Cargando el directorio..." />
      ) : (
        <div className="admin-table-wrap">
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
                    <button
                      className="admin-link"
                      type="button"
                      onClick={() => { void adminApi.getEmployee(empleado.legajo).then((r) => setDetalle(r.empleado)).catch(() => {}) }}
                    >
                      {nombreCompleto(empleado)}
                    </button>
                  </td>
                  <td>{empleado.legajo}</td>
                  <td>{empleado.email ?? '—'}</td>
                  <td><span className={`admin-chip admin-chip--${empleado.rol === 'ADMIN' ? 'admin' : 'asesor'}`}>{empleado.rol}</span></td>
                  <td><span className={`admin-chip admin-chip--estado-${empleado.estado.toLowerCase()}`}>{empleado.estado}</span></td>
                  <td className="admin-table__actions">
                    {accionesDe(empleado).map(({ accion, label }) => (
                      <button key={accion} className="admin-action" type="button" onClick={() => pedirConfirmacion(accion, empleado)}>
                        {label}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="admin-directory__hint">
        La propia cuenta no se administra desde el directorio: operá el cambio desde «Mi perfil».
      </p>

      {detalle ? (
        <div className="admin-modal__backdrop" role="presentation" onClick={() => setDetalle(null)}>
          <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Detalle del empleado" onClick={(event) => event.stopPropagation()}>
            <h2 className="admin-modal__title">Detalle del empleado</h2>
            <dl className="admin-modal__facts">
              <div><dt>Legajo</dt><dd>{detalle.legajo}</dd></div>
              <div><dt>Nombre</dt><dd>{nombreCompleto(detalle)}</dd></div>
              <div><dt>Correo</dt><dd>{detalle.email ?? '—'}</dd></div>
              <div><dt>Teléfono</dt><dd>{detalle.telefono ?? '—'}</dd></div>
              <div><dt>Rol</dt><dd>{detalle.rol}</dd></div>
              <div><dt>Estado</dt><dd>{detalle.estado}</dd></div>
            </dl>
            {detalle.estado === 'ACTIVO' && !esPropia(detalle) ? (
              <div className="admin-modal__actions">
                {accionRolDe(detalle) ? (
                  <button
                    className="admin-button admin-button--ghost"
                    type="button"
                    onClick={() => { setDetalle(null); setAccionPendiente({ accion: accionRolDe(detalle).accion, empleado: detalle }) }}
                  >
                    {accionRolDe(detalle).label}
                  </button>
                ) : null}
                <button className="admin-button" type="button" onClick={() => setDetalle(null)}>Cerrar</button>
              </div>
            ) : (
              <div className="admin-modal__actions">
                <button className="admin-button" type="button" onClick={() => setDetalle(null)}>Cerrar</button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {accionPendiente ? (
        <ModalAccion
          accion={accionPendiente.accion}
          destino={DESTINO_ACCION[accionPendiente.accion]}
          detalle={detalle}
          submitting={submitting}
          onClose={() => { setAccionPendiente(null); }}
          onConfirm={() => void confirmar()}
        />
      ) : null}
    </div>
  )
}
