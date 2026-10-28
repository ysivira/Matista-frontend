/**
 * ============================================================
 * MATISTA | VALIDACIÓN REMOTA DE CAMPAÑAS
 * ============================================================
 *
 * Archivo: useCommercialValidation.js
 * Módulo: Asesor
 *
 * Responsabilidad:
 * Consultar errores comerciales y controlar su visibilidad y vigencia por petición.
 *
 * CONTENIDO:
 * - Función useCommercialValidation.
 *
 * DEPENDENCIAS:
 * - react
 * - ../api/asesorApi.js
 *
 * ============================================================
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { guardarAsesor } from '../api/asesorApi.js';

/** Valida descuentos y familia opcional con backend, sin duplicar elegibilidad joven; filtra visibilidad y respuestas obsoletas. */
export function useCommercialValidation(familia) {
  const familiaClave = JSON.stringify(familia);
  const secuencia = useRef(0);
  const utilizados = useRef(new Set());
  const mostrarTodos = useRef(false);
  const [estado, setEstado] = useState({
    errores: [],
    pendiente: false,
    tecnico: ''
  });
  useEffect(() => () => {
    secuencia.current += 1;
  }, []);
  /** Invalida una petición anterior sin borrar prematuramente mensajes de campos todavía sin corregir. */
  const editar = useCallback(() => {
    secuencia.current += 1;
    setEstado(s => ({
      ...s,
      pendiente: false
    }));
  }, []);
  /** Envía opciones y familia actual o recién editada; todos los errores retornados siguen bloqueando el avance. */
  const validar = useCallback(async (condiciones, {
    campos = [],
    todos = false,
    familia: nuevaFamilia
  } = {}) => {
    campos.forEach(campo => utilizados.current.add(campo));
    if (todos) mostrarTodos.current = true;
    const turno = ++secuencia.current;
    // Retira el mensaje anterior del campo que se está corrigiendo, sin presumir que ya es válido.
    setEstado(s => ({
      ...s,
      errores: s.errores.filter(e => !campos.includes(e.field)),
      pendiente: true,
      tecnico: ''
    }));
    try {
      const contexto = nuevaFamilia ?? (familiaClave ? JSON.parse(familiaClave) : undefined);
      const r = await guardarAsesor('condiciones/validacion', {
        condiciones,
        ...(contexto ? {
          familia: contexto
        } : {})
      });
      if (turno !== secuencia.current) return null;
      const errores = r.errores.filter(e => {
        const valor = e.field.split('.').slice(1).reduce((objeto, clave) => objeto?.[clave],
          condiciones);
        return mostrarTodos.current || utilizados.current.has(e.field) || valor !== ''
          && valor != null;
      });
      setEstado({
        errores,
        pendiente: false,
        tecnico: ''
      });
      return r.errores;
    } catch {
      if (turno === secuencia.current) setEstado(s => ({
        ...s,
        pendiente: false,
        tecnico: 'No se pudo verificar la política comercial. Reintente antes de continuar.'
      }));
      return null;
    }
  }, [familiaClave]);
  /** Incorpora los detalles de un rechazo autoritativo de preparación o emisión. */
  const recibir = useCallback(errores => {
    mostrarTodos.current = true;
    setEstado({
      errores,
      pendiente: false,
      tecnico: ''
    });
  }, []);
  /** Permite confirmar blur únicamente después de una edición real del control. */
  const utilizado = useCallback(campo => utilizados.current.has(campo), []);
  /** Un tramo recién creado no hereda interacción del que antes ocupaba su índice; mantiene otros errores ya revelados. */
  const iniciarTramo = useCallback(indice => {
    estado.errores.forEach(e => utilizados.current.add(e.field));
    const prefijo = `condiciones.tramos.${indice}.`;
    utilizados.current.delete(prefijo + 'meses');
    utilizados.current.delete(prefijo + 'porcentaje_id');
    mostrarTodos.current = false;
    setEstado(s => ({
      ...s,
      errores: s.errores.filter(e => !e.field.startsWith(prefijo))
    }));
  }, [estado.errores]);
  return {
    ...estado,
    editar,
    validar,
    recibir,
    utilizado,
    iniciarTramo
  };
}
