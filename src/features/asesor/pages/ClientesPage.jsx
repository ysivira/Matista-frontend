/**
 * ============================================================
 * MATISTA | GESTIÓN DE CLIENTES
 * ============================================================
 *
 * Archivo: ClientesPage.jsx
 * Módulo: Asesor
 *
 * Responsabilidad:
 * Componer búsqueda y edición de clientes con el listado propio filtrado por DNI.
 *
 * CONTENIDO:
 * - Función ClientesPage.
 *
 * DEPENDENCIAS:
 * - react-router-dom
 * - react
 * - ../components/ClientSearch.jsx
 * - ../hooks/useAsesorConsulta.js
 * - ../../../shared/ui/EncabezadoContextual.jsx
 *
 * ============================================================
 */
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ClientSearch } from '../components/ClientSearch.jsx';
import { useAsesorConsulta } from '../hooks/useAsesorConsulta.js';
import { EncabezadoContextual } from '../../../shared/ui/EncabezadoContextual.jsx';

/** Gestión del titular y familia con búsqueda por DNI y listado exclusivamente propio. */
export function ClientesPage() {
  const [dni, setDni] = useState('');
  const {
    data,
    error,
    loading,
    recargar
  } = useAsesorConsulta(`clientes?dni=${encodeURIComponent(dni)}`);
  return <><EncabezadoContextual etiqueta="Gestión comercial" titulo="Clientes"
    descripcion="Busca por DNI para registrar o actualizar un cliente autorizado." />
    <ClientSearch />
    <section className="ase-panel">
      <h3>Mis clientes</h3>
      <label>Filtrar DNI<input
        inputMode="numeric"
        value={dni}
        onChange={e => setDni(e.target.value)}
      /></label>
      <button onClick={recargar}>Actualizar listado</button>
      {loading && <p role="status">Cargando clientes...</p>}
      {error && <p role="alert">{error}</p>}
      <ul>
        {data?.clientes.map(c => <li key={c.id}>{c.dni} · {c.nombres} {c.apellidos} <Link to={`/asesor/nueva?cliente=${c.id}`}>Preparar cotización</Link></li>)}
      </ul>
      {data?.clientes.length === 0 && <p>No hay clientes para este filtro.</p>}
    </section></>;
}
