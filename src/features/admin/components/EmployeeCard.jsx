import { AdminAvatar } from './AdminAvatar.jsx'
import { inicialesDe } from './iniciales.js'
import { ChipEstado } from './ChipEstado.jsx'

/**
 * Menú contextual de rol compartido por la tabla del directorio y las
 * tarjetas de empleado. Presenta el botón ⋯ accesible y, cuando está
 * abierto, el ítem con la única acción de rol disponible del estado ACTIVO.
 * @param {{empleado: object, nombreMostrado: string, accionRol: ?{accion: string, label: string}, abierto: boolean, onToggle: () => void, onElegir: (accion: string, empleado: object) => void}} props Estado del menú.
 * @returns {import('react').ReactElement} Botón y menú anclados a la fila o tarjeta.
 */
export function MenuRolEmpleados({ empleado, nombreMostrado, accionRol, abierto, onToggle, onElegir }) {
  if (!accionRol) return null
  return (
    <div className="admin-menu__wrap">
      <button
        className="admin-icon-button"
        type="button"
        aria-label={`Más acciones de ${nombreMostrado}`}
        title="Más acciones"
        aria-expanded={abierto}
        onClick={onToggle}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5.5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="18.5" r="1.6" />
        </svg>
      </button>
      {abierto ? (
        <div className="admin-menu" role="menu">
          <button
            className="admin-menu__item"
            type="button"
            role="menuitem"
            onClick={() => { onElegir(accionRol.accion, empleado) }}
          >
            {accionRol.label}
          </button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Tarjeta de empleado para tablet y móvil del directorio: presenta nombre,
 * legajo, correo, rol y estado, junto a las acciones permitidas por el
 * estado y el rol. Solo presenta; las reglas viven en el servidor y las
 * confirmaciones reutilizan el modal compartido de la página.
 * @param {{empleado: object, nombreMostrado: string, acciones: Array<{accion: string, label: string, icono: string}>, accionRol: ?{accion: string, label: string}, menuAbierto: boolean, onMenuRol: () => void, onPedirAccion: (accion: string, empleado: object) => void, onVerDetalle: () => void, onElegirRol: (accion: string, empleado: object) => void}} props Datos y callbacks de la fila.
 * @returns {import('react').ReactElement} Tarjeta accesible del empleado.
 */
export function EmployeeCard({ empleado, nombreMostrado, acciones, accionRol, menuAbierto, onMenuRol, onPedirAccion, onVerDetalle, onElegirRol }) {
  return (
    <article className="admin-directory-card">
      <div className="admin-directory-card__head">
        <AdminAvatar iniciales={inicialesDe(empleado)} pequeno />
        <div className="admin-directory-card__titular">
          <button className="admin-directory-card__nombre" type="button" onClick={onVerDetalle}>
            {nombreMostrado}
          </button>
          <span className="admin-directory-card__legajo">{empleado.legajo}</span>
        </div>
        <ChipEstado estado={empleado.estado} />
      </div>

      <dl className="admin-directory-card__datos">
        <div>
          <dt>Correo</dt>
          <dd className="admin-directory-card__correo">{empleado.email ?? '—'}</dd>
        </div>
        <div>
          <dt>Rol</dt>
          <dd>
            <span className={`admin-chip admin-chip--${empleado.rol === 'ADMIN' ? 'admin' : 'asesor'}`}>{empleado.rol}</span>
          </dd>
        </div>
      </dl>

      {acciones.length > 0 || accionRol ? (
        <div className="admin-directory-card__acciones">
          {acciones.map(({ accion, label, icono }) => (
            <button
              key={accion}
              className="admin-icon-button"
              type="button"
              aria-label={label}
              title={label}
              onClick={() => onPedirAccion(accion, empleado)}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={icono} />
              </svg>
            </button>
          ))}
          <MenuRolEmpleados
            empleado={empleado}
            nombreMostrado={nombreMostrado}
            accionRol={accionRol}
            abierto={menuAbierto}
            onToggle={onMenuRol}
            onElegir={onElegirRol}
          />
        </div>
      ) : null}
    </article>
  )
}
