/**
 * ============================================================
 * MATISTA | EDICIÓN DEL GRUPO FAMILIAR
 * ============================================================
 *
 * Archivo: FamilyGroupEditor.jsx
 * Módulo: Asesor
 *
 * Responsabilidad:
 * Editar edades y vínculos y sincronizar cónyuge y estado civil declarado.
 *
 * CONTENIDO:
 * - Función FamilyGroupEditor.
 *
 * ============================================================
 */
/** Editor de edades/vínculos: sincroniza cónyuge con CASADO sin inferir soltería al quitarlo ni alterar fechas históricas. */
export function FamilyGroupEditor({
  value,
  onChange,
  cliente,
  errorServidor
}) {
  const tieneConyuge = value.miembros.some(m => m.parentesco === 'CONYUGE');
  /** Cambia el atributo del titular; con cónyuge no permite una combinación civil incompatible. */
  function titular(campo, valor) {
    if (campo === 'estado_civil' && tieneConyuge && valor !== 'CASADO') return;
    onChange({
      ...value,
      titular: {
        ...value.titular,
        [campo]: valor
      }
    });
  }
  /** Cambia un integrante; seleccionar cónyuge fija CASADO y nunca admite un segundo cónyuge. */
  function miembro(indice, campo, valor) {
    const seleccionaConyuge = campo === 'parentesco' && valor === 'CONYUGE';
    if (seleccionaConyuge && value.miembros.some((m, i) => i !== indice
      && m.parentesco === 'CONYUGE')) return;
    onChange({
      ...value,
      titular: seleccionaConyuge ? {
        ...value.titular,
        estado_civil: 'CASADO'
      } : value.titular,
      miembros: value.miembros.map((m, i) => i === indice ? {
        ...m,
        [campo]: valor
      } : m)
    });
  }
  return <section data-section="familia" className={`ase-config-card ase-family${errorServidor
    ? ' ase-section-invalid' :
    ''}`}>
    <div className="ase-card-title">
      <h3><b>3</b> Composición del Grupo Familiar</h3>
      <button
        type="button"
        aria-label="Agregar integrante"
        className="ase-small-button"
        disabled={value.miembros.length >= 30}
        onClick={() => onChange({
          ...value,
          miembros: [...value.miembros, {
            parentesco: 'HIJO',
            edad: ''
          }]
        })}
      >+ Agregar integrante</button>
    </div>
    <div className="ase-table">
      <table>
        <thead>
          <tr>
            <th>Integrante / Rol</th>
            <th>Nombre y apellido</th>
            <th>Edad</th>
            <th>Vínculo / Estado civil</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span className="ase-pill">Titular</span></td>
            <td>{cliente ? `${cliente.nombres} ${cliente.apellidos}` : 'Titular'}</td>
            <td>
              <label className="ase-sr-only" htmlFor="ase-edad-titular">Edad del titular</label>
              <input
                id="ase-edad-titular"
                type="number"
                min="0"
                max="120"
                step="1"
                required
                value={value.titular.edad}
                onChange={e => titular('edad', e.target.value === '' ? '' : Number(e.target.value))}
              />
            </td>
            <td>
              <label className="ase-sr-only" htmlFor="ase-estado-civil">Estado civil</label>
              <select
                id="ase-estado-civil"
                aria-describedby={tieneConyuge ? 'ase-conyuge-civil' : undefined}
                value={value.titular.estado_civil}
                onChange={e => titular('estado_civil', e.target.value)}
              >
                <option value="SOLTERO" disabled={tieneConyuge}>Soltero/a</option>
                <option value="CASADO">Casado/a</option>
                <option value="OTRO" disabled={tieneConyuge}>Otro</option>
              </select>
              {tieneConyuge && <small id="ase-conyuge-civil">El vínculo Cónyuge requiere Casado/a. Quite o corrija ese vínculo antes de cambiar el estado civil.</small>}
            </td>
            <td><span className="ase-symbol" aria-label="Titular permanente">lock</span></td>
          </tr>
          {value.miembros.map((m, i) => <tr key={i}>
            <td><span className="ase-pill">Adicional {i + 1}</span></td>
            <td className="ase-muted">Identificado por vínculo</td>
            <td>
              <input
                aria-label={`Edad integrante ${i + 1}`}
                type="number"
                min="0"
                max="120"
                required
                value={m.edad}
                onChange={e => miembro(i, 'edad', e.target.value === '' ? '' : Number(e.target.value))}
              />
            </td>
            <td>
              <select
                required
                aria-label={`Parentesco ${i + 1}`}
                value={['CONYUGE', 'HIJO'].includes(m.parentesco) ? m.parentesco : ''}
                onChange={e => miembro(i, 'parentesco', e.target.value)}
              >
                <option value="" disabled>Seleccione el vínculo real</option>
                <option value="CONYUGE" disabled={tieneConyuge && m.parentesco !== 'CONYUGE'}>Cónyuge</option>
                <option value="HIJO">Hijo/a</option>
              </select>
              {m.parentesco === 'ADHERENTE' && <small className="ase-field-error">El registro anterior no indica el vínculo real. Seleccione cónyuge o hijo/a para esta nueva preparación.</small>}
            </td>
            <td>
              <button
                type="button"
                className="ase-icon-button ase-danger"
                aria-label={`Quitar integrante ${i + 1}`}
                onClick={() => onChange({
                  ...value,
                  miembros: value.miembros.filter((_, n) => n !== i)
                })}
              ><span className="ase-symbol" aria-hidden="true">delete</span></button>
            </td>
          </tr>)}
        </tbody>
      </table>
    </div>
    {errorServidor && <p role="alert" className="ase-field-error">{errorServidor}</p>}
    <small>Edades en años cumplidos declaradas para esta cotización. La recotización recupera las edades guardadas y permite actualizarlas.</small>
  </section>;
}
