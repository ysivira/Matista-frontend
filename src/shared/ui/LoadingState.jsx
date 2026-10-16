/**
 * Anuncia de forma accesible una operación pendiente sin imponer un layout de módulo.
 * @param {object} props Propiedades del estado.
 * @param {string} [props.message] Mensaje visible para la operación en curso.
 * @returns {import('react').ReactElement} Indicador accesible de carga.
 */
export function LoadingState({ message = 'Cargando...' }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      {message}
    </div>
  )
}
