/**
 * ============================================================
 * MATISTA | CONSULTAS COMERCIALES REACT
 * ============================================================
 *
 * Archivo: useAsesorConsulta.js
 * Módulo: Asesor
 *
 * Responsabilidad:
 * Cargar y recargar una ruta comercial descartando respuestas tras el desmontaje.
 *
 * CONTENIDO:
 * - Función useAsesorConsulta.
 *
 * DEPENDENCIAS:
 * - react
 * - ../api/asesorApi.js
 *
 * ============================================================
 */
import { useEffect, useState } from 'react';
import { consultarAsesor } from '../api/asesorApi.js';

/** Consulta una ruta comercial y descarta respuestas de pantallas ya desmontadas. */
export function useAsesorConsulta(ruta) {
  const [estado, setEstado] = useState({
    data: null,
    error: null,
    loading: true
  });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!ruta) return undefined;
    let vigente = true;
    queueMicrotask(() => {
      if (vigente) setEstado({
        data: null,
        error: null,
        loading: true
      });
    });
    consultarAsesor(ruta).then(data => {
      if (vigente) setEstado({
        data,
        error: null,
        loading: false
      });
    }, error => {
      if (vigente) setEstado({
        data: null,
        error: error.message,
        loading: false
      });
    });
    return () => {
      vigente = false;
    };
  }, [ruta, revision]);
  /** Repite la lectura tras una escritura sin conservar una revisión obsoleta. */
  function recargar() {
    setRevision(valor => valor + 1);
  }
  return ruta ? {
    ...estado,
    recargar
  } : {
    data: null,
    error: null,
    loading: false,
    recargar
  };
}
