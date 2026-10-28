/**
 * ============================================================
 * MATISTA | GESTIÓN DE VERSIONES TARIFARIAS
 * ============================================================
 *
 * Archivo: VersionesPage.jsx
 * Módulo: Administración
 *
 * Responsabilidad:
 * Consultar historial, conducir la edición y activación de versiones y
 * presentar auditoría y deshacer con las revisiones del servidor.
 *
 * CONTENIDO:
 * - Función VersionesPage.
 *
 * DEPENDENCIAS:
 * - react
 * - react-router-dom
 * - ../api/adminApi.js
 * - ../components/avisoAdmin.js
 * - ../components/formatoMonetario.js
 * - ../components/ChipEstado.jsx
 * - ../components/etiquetasEstado.js
 * - ../components/cambiosReversibles.js
 * - ../../auth/hooks/useSession.js
 * - ../../../shared/ui/LoadingState.jsx
 * - ../../auth/components/AuthAlert.jsx
 *
 * ============================================================
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../api/adminApi.js';
import { avisoAdminPara, sesionCayoPara } from '../components/avisoAdmin.js';
import { formatearPrecioARS } from '../components/formatoMonetario.js';
import { ChipEstado } from '../components/ChipEstado.jsx';
import { etiquetaEstado } from '../components/etiquetasEstado.js';
import { hayCambiosReversibles } from '../components/cambiosReversibles.js';
import { useSession } from '../../auth/hooks/useSession.js';
import { LoadingState } from '../../../shared/ui/LoadingState.jsx';
import { AuthAlert } from '../../auth/components/AuthAlert.jsx';

/** Etiquetas amigables del resumen de cambios para la pantalla. */
const ETIQUETAS_EVENTO = Object.freeze({
  CREACION: 'Creación',
  FINALIZACION: 'Finalización',
  ACTIVACION: 'Activación',
  REANUDACION: 'Volver a edición',
  DESCARTE: 'Descarte'
});
const FORMATEADOR_FECHA = new Intl.DateTimeFormat('es-AR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/Argentina/Buenos_Aires'
});

/**
 * Formatea una fecha del backend con el calendario argentino y la zona
 * horaria de Buenos Aires para que el resultado no dependa del navegador.
 * @param {string|null|undefined} fecha Fecha ISO recibida del backend.
 * @returns {string} Fecha y hora visibles, o cadena vacía si el valor no es válido.
 */
function formatearFecha(fecha) {
  if (!fecha) return '';
  const fechaNormalizada = new Date(fecha);
  if (Number.isNaN(fechaNormalizada.getTime())) return '';
  return FORMATEADOR_FECHA.format(fechaNormalizada);
}

/**
 * Decide la etiqueta amigable de un evento del resumen: las reversiones del
 * deshacer se reconocen por el prefijo 'DESHACE:' que el backend deja en
 * el detalle por convención; el resto se traduce por su tipo.
 * @param {object} evento Evento del resumen de auditoría.
 * @returns {string} Etiqueta visible del evento.
 */
function etiquetaDeEvento(evento) {
  if (typeof evento.detalle === 'string' && evento.detalle.startsWith('DESHACE')) {
    return evento.tipo_operacion === 'AUMENTO_MASIVO' ? 'Reversión del aumento' :
      'Reversión de precio';
  }
  if (evento.tipo_operacion === 'AUMENTO_MASIVO') return 'Aumento masivo';
  if (evento.tipo_operacion === 'PRECIO' && evento.agrupador) return 'Fila del aumento';
  if (evento.tipo_operacion === 'PRECIO') return 'Edición de precio';
  return ETIQUETAS_EVENTO[evento.tipo_evento] ?? evento.tipo_evento ?? '';
}

/**
 * Decide el texto principal de un evento del resumen: con entidad muestra
 * su fila con los valores anterior y nuevo; el cabezal del aumento masivo
 * muestra el detalle tal como lo registró el backend (incluye el
 * porcentaje) con la cantidad real de filas afectadas y la modalidad que
 * se deduce de SUS PROPIOS hijos de auditoría.
 * @param {object} evento Evento del resumen de auditoría.
 * @param {Map<string, string>} mapaNombresPlan Plan id -> nombre del snapshot.
 * @param {object[]} eventos Lista completa de eventos (para leer los hijos del grupo).
 * @returns {string} Descripción legible del evento.
 */
function textoDeEvento(evento, mapaNombresPlan, eventos) {
  if (evento.tipo_operacion === 'AUMENTO_MASIVO') {
    const hijos = eventos.filter(hijo => hijo.agrupador === evento.id && hijo.entidad);
    const modalidades = [...new Set(hijos.map(hijo => hijo.entidad.tipo_ingreso))].join(' y ');
    return `(${evento.filas_agrupadas ?? 0} fila(s)) ${modalidades
      ? `${modalidades}. ` : ''}${evento.detalle}`;
  }
  if (evento.entidad) {
    const nombrePlan = mapaNombresPlan.get(String(evento.entidad.plan_id)) ?? `plan ${evento.entidad.plan_id}`;
    return `${nombrePlan} · ${evento.entidad.tipo_ingreso} · ${evento.entidad.rango_clave}: ` + `${formatearPrecioARS(evento.valor_anterior)} → ${formatearPrecioARS(evento.valor_nuevo)}`;
  }
  return evento.detalle ?? '';
}

/**
 * Compone la firma del responsable real del evento (legajo junto al nombre).
 * @param {object} evento Evento del resumen de auditoría.
 * @returns {string} Firma visible o indicador de sistema.
 */
function actorDeEvento(evento) {
  return evento.actor_legajo
    ? `${evento.actor_nombre ?? ''} ${evento.actor_apellido ?? ''} (${evento.actor_legajo})`.trim() : 'Sistema';
}

/**
 * ============================================================
 * VERSIONES PAGE
 * ============================================================
 *
 * Pantalla del ciclo de vida de versiones del tarifario:
 * lista el historial completo, muestra el snapshot de la versión elegida y
 * conduce el ciclo de edición completo (copiar borrador, aumento masivo,
 * precios individuales, finalización y activación manual). El backend
 * conserva la autoridad: carreras concurrentes, estados incompatibles o
 * revisión desfasada llegan como 409 del contrato y se presentan como
 * aviso, recargando la realidad vigente del servidor. La versión elegida
 * viaja en la URL como búsqueda profunda (?id=...).
 * @returns {import('react').ReactElement} Historial con panel de edición.
 */
export function VersionesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const idParam = searchParams.get('id');
  const [versiones, setVersiones] = useState(null); // null: historial aún no consultado
  const [detalle, setDetalle] = useState(null); // { version, tarifas } de la versión elegida
  const [resumen, setResumen] = useState(null); // { version, eventos } auditoría real del backend
  const [cargando, setCargando] = useState(true);
  const [operando, setOperando] = useState(false); // escritura en curso: deshabilita botones
  const [aviso, setAviso] = useState(null);
  const [formAumento, setFormAumento] = useState(null); // { porcentaje, tipoIngreso, paso } abierto
  const [previaAumento,
    setPreviaAumento] = useState(null); // { clave, filas } de la previsualización backend
  const [previaEstado,
    setPreviaEstado] = useState('inactiva'); // 'inactiva' | 'cargando' | 'lista' | 'error'
  const [edicion, setEdicion] = useState(null); // { tarifaId, precio } de la ÚNICA fila en edición
  const [deshacerArmado,
    setDeshacerArmado] = useState(false); // confirmación de dos clics del deshacer
  const [reanudarArmado,
    setReanudarArmado] = useState(false); // confirmación de dos clics de 'Volver a edición'
  const [descarteArmado,
    setDescarteArmado] = useState(false); // confirmación de dos clics del descarte
  const [motivoDescarte,
    setMotivoDescarte] = useState(''); // motivo de negocio exigido por el backend
  const [mostrarDescartadas, setMostrarDescartadas] = useState(false); // filtro del historial
  const consultaActualRef = useRef(0);
  const previaConsultaRef = useRef(0); // guardia de respuestas viejas de la previsualización backend
  const {
    clearSession
  } = useSession();

  /**
   * Cuando el backend confirma que la sesión ya no existe (cookie vencida
   * o revocada), limpia el estado global: el guardia de ruta redirigirá a
   * /login y presentará el mensaje de sesión vencida. Sin reintentos
   * automáticos ni pedidos ciegos contra un servidor que rechazó la sesión.
   * @param {unknown} error Error capturado de un pedido ADMIN.
   * @returns {boolean} true cuando el error corresponde a sesión vencida.
   */
  function manejarSesionVencida(error) {
    if (!sesionCayoPara(error)) return false;
    setAviso({
      tone: 'error',
      title: 'Tu sesión venció',
      message: 'Iniciá sesión de nuevo para continuar operando.'
    });
    clearSession();
    return true;
  }

  /**
   * Consulta el historial y, si hay versión elegida, su cabecera y snapshot.
   * @param {string|null} idParam Identificador tomado de la URL o null.
   * @returns {Promise<void>} Finaliza al aplicar los estados o el aviso.
   */
  async function cargar(idParam) {
    const consulta = consultaActualRef.current + 1;
    consultaActualRef.current = consulta;
    setCargando(true);
    // El panel pertenece exclusivamente a la consulta en curso: se desmonta
    // antes del pedido para que un fallo no deje datos ni controles de la
    // versión consultada anteriormente.
    setDetalle(null);
    setResumen(null);
    setFormAumento(null);
    setPreviaAumento(null);
    setPreviaEstado('inactiva');
    setEdicion(null);
    setDeshacerArmado(false);
    setReanudarArmado(false);
    setDescarteArmado(false);
    setMotivoDescarte('');
    try {
      const historial = await adminApi.listarVersiones();
      if (consulta !== consultaActualRef.current) return;
      setVersiones(historial.versiones ?? []);
      if (idParam) {
        const [cabecera, snapshot, auditoria] = await Promise.all([adminApi.obtenerVersion(idParam),
          adminApi.listarTarifasVersion(idParam), adminApi.obtenerEventosVersion(idParam)]);
        if (consulta !== consultaActualRef.current) return;
        setDetalle({
          version: cabecera.version,
          tarifas: snapshot.tarifas
        });
        setResumen(auditoria);
      }
    } catch (error) {
      if (consulta !== consultaActualRef.current) return;
      if (manejarSesionVencida(error)) return;
      setAviso(avisoAdminPara(error,
        'No se pudo consultar el historial de versiones. Intenta nuevamente.'));
    } finally {
      if (consulta === consultaActualRef.current) setCargando(false);
    }
  }
  useEffect(() => {
    // cargar() se difiere un microtask para que sus setState iniciales queden
    // fuera del render del efecto (react-hooks/set-state-in-effect).
    //
    // La dependencia se reduce a idParam a propósito: cargar() solo usa
    // valores estables (refs, setters, módulos) y su disparo por identidad
    // nueva duplicaría consultas idempotentes en cada render. Cada pedido
    // trae el guardián consultaActualRef que descarta respuestas viejas,
    // por lo que un disparo tardío no puede pisar un estado reciente.
    queueMicrotask(() => {
      void cargar(idParam);
    });
    // Cada cambio de versión en la URL recarga historial y detalle.
    //
    // La dependencia se reduce a idParam a propósito: cargar() solo usa
    // valores estables (refs, setters, módulos) y su disparo por identidad
    // nueva duplicaria consultas idempotentes en cada render; el guardián
    // consultaActualRef descarta respuestas viejas, asi que un disparo
    // tardio no puede pisar un estado reciente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idParam]);

  /** Consulta la previsualización al backend (única implementación económica). */
  const consultarPreviaAumento = useCallback(async () => {
    if (formAumento?.paso !== 'confirmacion' || !detalle) return;
    const consulta = previaConsultaRef.current + 1;
    previaConsultaRef.current = consulta;
    const porcentaje = formAumento.porcentaje;
    const tipoIngreso = formAumento.tipoIngreso;
    const clave = `${detalle.version.id}|${porcentaje}|${tipoIngreso}`;
    setPreviaAumento(null);
    setPreviaEstado('cargando');
    // La previsualización vive en el backend: los importes provienen de la
    // misma función económica del aumento definitivo y React solo los
    // muestra. El guardián previaConsultaRef descarta respuestas viejas
    // cuando el usuario cambia rápido porcentaje o modalidad, de modo que
    // nunca se muestre una tabla que no corresponde a los valores del
    // formulario; ante un fallo se muestra el error del servidor sin
    // calcular alternativas locales.
    (async () => {
      try {
        const respuesta = await adminApi.previsualizarAumentoVersion(detalle.version.id, {
          porcentaje,
          ...(tipoIngreso ? {
            tipoIngreso
          } : {})
        });
        if (consulta !== previaConsultaRef.current) return;
        setPreviaAumento({
          clave,
          filas: respuesta.filas
        });
        setPreviaEstado('lista');
      } catch (error) {
        if (consulta !== previaConsultaRef.current) return;
        if (manejarSesionVencida(error)) return;
        setPreviaEstado('error');
        setAviso(avisoAdminPara(error,
          'No se pudo calcular la previsualización del aumento. Intenta nuevamente.'));
      }
    })();
  }, [formAumento, detalle]);

  // Se ejecuta en una microtask (como cargar()) para que los setState no
  // ocurran sincronamente dentro del cuerpo del efecto.
  // `manejarSesionVencida` solo usa setters y clearSession (estables), por lo
  // que no genera cierre obsoleto; el guardia previaConsultaRef descarta
  // respuestas tardías.
  useEffect(() => {
    queueMicrotask(() => {
      void consultarPreviaAumento();
    });
  }, [consultarPreviaAumento]);

  /**
   * Envuelve cada escritura del ciclo en un bloqueo de pantalla y recarga
   * del servidor. La pantalla nunca predice estados ni revisiones: tras el
   * éxito (o el 409 del contrato) el servidor vuelve a definir la realidad.
   * @param {Function} operacion API de escritura a ejecutar.
   * @param {string} etapa Etiqueta para el aviso si la escritura falla.
   * @returns {Promise<{resultado: object|null, error: unknown|null}>} Salida para decisiones
   * locales.
   */
  async function operarSobreElCiclo(operacion, etapa) {
    setOperando(true);
    setAviso(null);
    try {
      const resultado = await operacion();
      await cargar(searchParams.get('id'));
      return {
        resultado,
        error: null
      };
    } catch (error) {
      if (manejarSesionVencida(error)) {
        // Sesión vencida: no hay recarga ni pedido adicional contra un
        // servidor que ya rechazó la cookie; el guardia lleva a /login.
        return {
          resultado: null,
          error
        };
      }
      setAviso(avisoAdminPara(error, `No se pudo completar ${etapa}. Intenta nuevamente.`));
      // Con revisión desfasada o estado cambiado, la recarga trae la
      // revisión vigente y restablece los botones según el estado real:
      // el primer reintento del usuario ya parte del estado correcto.
      await cargar(searchParams.get('id'));
      return {
        resultado: null,
        error
      };
    } finally {
      setOperando(false);
    }
  }

  /**
   * Abre el borrador de edición copiando la versión ACTIVA vigente (caso A).
   * Si otro ADMIN ya abrió uno, el 409 del contrato explica quién y cuándo.
   * @returns {Promise<void>}
   */
  async function copiarBorrador() {
    const {
      resultado
    } = await operarSobreElCiclo(() => adminApi.crearBorradorTarifario(),
      'la creación del borrador');
    if (resultado?.version?.id) setSearchParams({
      id: String(resultado.version.id)
    }, {
      replace: true
    });
  }

  /**
   * Valida el formato del porcentaje en el cliente (experiencia de usuario)
   * y avanza al paso de confirmación. La previsualización de importes NO se
   * calcula aquí: la obtiene el backend por API con la misma función
   * económica del aumento definitivo (SPEC-ARCH-16).
   * @returns {void}
   */
  function irAConfirmacionAumento() {
    if (!detalle) return;
    const texto = String(formAumento.porcentaje).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
      setAviso({
        tone: 'error',
        title: 'Revisá el porcentaje ingresado',
        message: 'Ingresá un porcentaje entre 0.01 y 99.99 para continuar.'
      });
      return;
    }
    setAviso(null);
    setFormAumento({
      ...formAumento,
      porcentaje: texto,
      paso: 'confirmacion'
    });
  }

  /**
   * Aplica el aumento masivo confirmado (caso B) y presenta el aviso de
   * éxito con la respuesta del servidor antes de la recarga final.
   * @returns {Promise<void>}
   */
  async function confirmarAumento() {
    if (!detalle) return;
    const {
      porcentaje,
      tipoIngreso
    } = formAumento;
    const {
      resultado,
      error
    } = await operarSobreElCiclo(() => adminApi.aumentarVersion(detalle.version.id, {
      porcentaje,
      ...(tipoIngreso ? {
        tipoIngreso
      } : {}),
      revision: String(detalle.version.revision)
    }), 'el aumento masivo');
    if (!error) {
      setFormAumento(null);
      setAviso({
        tone: 'success',
        title: 'Aumento masivo registrado',
        message:
          `El ${porcentaje}% se aplicó a ${resultado?.filas ?? 0} fila(s). El resumen de cambios de abajo ya incluye la operación.`
      });
    }
  }

  /**
   * Abre el modo edición de UNA fila del borrador: el input nace con el
   * precio real de esa misma tarifa. Si había otra fila en edición, su
   * edición se cierra sin guardar (solo hay una activa simultánea).
   * @param {object} tarifa Fila del snapshot cuyo precio se edita.
   * @returns {void}
   */
  function abrirEdicion(tarifa) {
    setEdicion({
      tarifaId: String(tarifa.id),
      precio: String(tarifa.precio)
    });
  }

  /**
   * Cancela la edición de la fila activa sin llamar al backend; los valores
   * de todas las filas quedan como estaban en pantalla.
   * @returns {void}
   */
  function cancelarEdicion() {
    setEdicion(null);
  }

  /**
   * Normaliza el precio escrito en el input para el contrato del backend
   * (DECIMAL con punto decimal y dos cifras): quitó espacios y convierte
   * la coma argentina en punto antes de enviar.
   * @param {string} entrada Valor crudo del input.
   * @returns {string} Número decimal con punto, o cadena vacía si no es válido.
   */
  function normalizarPrecio(entrada) {
    const limpio = String(entrada).trim().replace(/\s/g, '').replace(',', '.');
    return /^\d+(\.\d{1,2})?$/.test(limpio) ? limpio : '';
  }

  /**
   * Guarda el precio editado de la fila activa (caso B individual): envía
   * al backend únicamente el identificador de esa tarifa, el precio
   * normalizado y la revisión vigente de la versión.
   * @param {object} tarifa Fila del snapshot en edición.
   * @returns {Promise<void>}
   */
  async function guardarPrecio(tarifa) {
    if (!detalle || !edicion) return;
    const precio = normalizarPrecio(edicion.precio);
    if (!precio) {
      setAviso({
        tone: 'error',
        title: 'Revisá el precio ingresado',
        message: 'Ingresá un importe válido con decimales separados por punto (por ejemplo 120.50).'
      });
      return;
    }
    const {
      error
    } = await operarSobreElCiclo(() => adminApi.editarPrecioTarifa(detalle.version.id, tarifa.id, {
      precio,
      revision: String(detalle.version.revision)
    }), 'la edición del precio');
    // Tras el éxito el servidor ya definió la nueva realidad de la fila;
    // cerramos la edición local y la recarga reemplaza todos los valores.
    if (!error) setEdicion(null);
  }

  /**
   * Deshace el último cambio económico vigente del borrador (edición
   * individual o aumento masivo completo). Exige confirmación de dos clics:
   * el primer clic arma la confirmación y el segundo ejecuta la operación,
   * que restaura los precios auditados y recarga la realidad del servidor.
   * @returns {Promise<void>}
   */
  async function ejecutarDeshacer() {
    if (!detalle) return;
    const {
      resultado,
      error
    } = await operarSobreElCiclo(() => adminApi.deshacerUltimoCambio(detalle.version.id,
      detalle.version.revision), 'el deshacer del último cambio');
    setDeshacerArmado(false);
    if (!error) {
      setAviso({
        tone: 'success',
        title: 'Último cambio deshecho',
        message:
          `Se restauraron ${resultado?.filas ?? 0} fila(s) según la auditoría. La revisión del borrador es ${resultado?.revision ?? detalle.version.revision}.`
      });
    }
  }

  /**
   * Cierra la edición del borrador; queda a la espera de la activación manual (caso C).
   * @returns {Promise<void>}
   */
  async function finalizarEdicion() {
    if (!detalle) return;
    await operarSobreElCiclo(() => adminApi.finalizarVersion(detalle.version.id, {
      revision: String(detalle.version.revision)
    }), 'la finalización del borrador');
  }

  /**
   * Activación manual del borrador finalizado; la ACTIVA vigente pasa a
   * HISTORICA dentro de una única transacción del backend (caso D).
   * @returns {Promise<void>}
   */
  async function activarBorrador() {
    if (!detalle) return;
    await operarSobreElCiclo(() => adminApi.activarVersion(detalle.version.id),
      'la activación de la versión');
  }

  /**
   * Reabre la edición de una versión finalizada por error (Volver a
   * edición): LISTA_PARA_ACTIVAR -> PREPARACION con el backend como
   * autoridad, conservando precios y auditoría, sin crear versiones.
   * @returns {Promise<void>}
   */
  async function volverAEdicion() {
    if (!detalle) return;
    const {
      error
    } = await operarSobreElCiclo(() => adminApi.reanudarVersion(detalle.version.id),
      'la reapertura de la versión');
    setReanudarArmado(false);
    if (!error) {
      setAviso({
        tone: 'success',
        title: 'Volviste a edición',
        message: 'La versión volvió a preparación conservando sus precios y su auditoría.'
      });
    }
  }

  /**
   * Recupera una version HISTORICA como nuevo borrador (SL-5b): el
   * backend copia fila a fila su snapshot sin tocar el registro original
   * y devuelve el borrador en PREPARACION con todos sus precios. Si
   * existe un borrador pendiente, el 409 del contrato explica quien lo
   * inicio y como continuar; el aviso del ciclo lo presenta tal cual.
   * Con exito la pantalla se abre sobre el nuevo borrador.
   * @param {object} version Historica elegida (fila o cabecera del panel).
   * @returns {Promise<void>}
   */
  async function recuperarComoBorrador(version) {
    const {
      resultado
    } = await operarSobreElCiclo(() => adminApi.recuperarVersionHistorica(version.id),
      'la recuperación de la versión histórica');
    if (resultado?.version?.id) {
      setSearchParams({
        id: String(resultado.version.id)
      }, {
        replace: true
      });
      setAviso({
        tone: 'success',
        title: 'Recuperaste la versión histórica',
        message:
          `La versión #${version.id} se copió como nuevo borrador con todos sus precios, listo para editar.`
      });
    }
  }

  /**
   * Descarta por completo una version pendiente (PREPARACION o
   * LISTA_PARA_ACTIVAR): el backend cambia el estado interno y audita el
   * evento DESCARTE con el motivo; los precios vigentes no se tocan y la
   * numeracion nunca se reutiliza. La pantalla queda en el detalle
   * descartado (solo lectura) con el aviso de exito y el historial
   * actualizado: dejar liberada la creacion de un borrador nuevo.
   * @returns {Promise<void>}
   */
  async function ejecutarDescarte() {
    if (!detalle) return;
    const {
      error
    } = await operarSobreElCiclo(() => adminApi.descartarVersion(detalle.version.id, {
      revision: detalle.version.revision,
      motivo: motivoDescarte.trim()
    }), 'el descarte de la versión');
    setDescarteArmado(false);
    if (!error) {
      setAviso({
        tone: 'success',
        title: 'Versión descartada',
        message:
          'La versión quedó fuera del ciclo conservando todos sus precios y su auditoría. Ya podés iniciar un borrador nuevo.'
      });
    }
  }

  /**
   * Selecciona una versión del historial dejándola en la URL como enlace
   * profundo y limpia avisos de la selección anterior; el botón también
   * cierra el panel (llamada sin id).
   * @param {string} versionId Identificador de la versión (string decimal).
   * @returns {void}
   */
  function elegirVersion(versionId) {
    setAviso(null);
    setSearchParams(versionId ? {
      id: versionId
    } : {}, {
      replace: true
    });
  }

  // Orden de presentacion del historial (correccion del punto 5): no es
  // un descending simple, es un orden por prioridad de trabajo con la
  // version vigente a la vista. Primero el borrador pendiente si existe
  // (PREPARACION o LISTA_PARA_ACTIVAR; la exclusividad del backend
  // garantiza que hay uno a lo sumo), segundo la version ACTIVA con su
  // marca Vigente, al final las historicas de la mas nueva a la mas
  // vieja y, cuando el filtro lo pide, las descartadas (estado interno
  // CANCELADA) tambien de la mas nueva a la mas vieja. El backend
  // mantiene su orden de cadena (creada ASC); es solo presentacion: la
  // pantalla reordena la misma lista sin pedidos extra y no altera
  // estados ni datos en MySQL.
  /** Ordena el bloque de estado: borrador/lista primero, luego activa, históricas y descartadas. */
  function centrarVersion(version) {
    if (version.estado === 'PREPARACION' || version.estado === 'LISTA_PARA_ACTIVAR') {
      return 0;
    }
    if (version.estado === 'ACTIVA') return 1;
    if (version.estado === 'CANCELADA') return 3;
    return 2;
  }
  /**
   * Compara dos versiones para la lista: primero prioridad de estado y,
   * dentro del mismo bloque, número de versión descendente.
   * @param {object} a Versión comparada.
   * @param {object} b Versión comparada.
   * @returns {number} Diferencia de prioridad o de identificador.
   */
  function compararVersiones(a, b) {
    const prioridadA = centrarVersion(a);
    const prioridadB = centrarVersion(b);
    if (prioridadA !== prioridadB) return prioridadA - prioridadB;
    // Dentro del mismo bloque (historicas o descartadas o mas de un
    // no-activo defensivo) manda el numero de version descendente.
    return Number(b.id) - Number(a.id);
  }

  // Las descartadas no se mezclan por defecto con las historicas: solo
  // se muestran cuando el filtro «descartadas» esta activo.
  const versionesOrdenadas = [...(versiones ?? [])].filter(version => mostrarDescartadas
    || version.estado !== 'CANCELADA').sort(compararVersiones);

  // La URL gobierna la selección: durante una transición nunca se habilita
  // ni se monta el detalle que todavía pertenece al identificador anterior.
  const versionDelDetalle = detalle && String(detalle.version.id) === idParam
    ? detalle.version : null;
  // Editable exige PREPARACION y una revisión del servidor que exista:
  // un null histórico (respuesta vieja o falla del DTO) no debe ofrecer
  // operaciones de escritura que seguro llegan con la revisión inválida.
  const editable = versionDelDetalle?.estado === 'PREPARACION'
    && Number.isInteger(versionDelDetalle.revision);
  const activable = versionDelDetalle?.estado === 'LISTA_PARA_ACTIVAR';
  // Version pendiente del ciclo: candidata al descarte, sea en
  // PREPARACION o LISTA_PARA_ACTIVAR. ACTIVA, HISTORICA y las ya
  // descartadas quedan fuera (el backend también valida).
  const pendiente = editable || activable;
  // Gating del deshacer: la auditoria real decide; versiones sin
  // modificaciones economicas no disparan pedidos al backend.
  const hayReversibles = editable && hayCambiosReversibles(resumen?.eventos ?? []);
  const permiteCopiar = versionDelDetalle?.estado === 'ACTIVA' && !operando;
  // Previa del aumento: la calcula el backend al entrar al paso de
  // confirmación (efecto de arriba). La clave garantiza que la tabla
  // mostrada corresponda exactamente al porcentaje y modalidad actuales
  // del formulario; mientras llega la respuesta no se muestran importes.
  const clavePrevia = formAumento?.paso === 'confirmacion' && detalle
    ? `${detalle.version.id}|${formAumento.porcentaje}|${formAumento.tipoIngreso}` : null;
  const previaVisible = previaAumento && clavePrevia === previaAumento.clave ? previaAumento : null;
  const mapaNombresPlan = new Map((detalle?.tarifas ?? []).map(tarifa => [String(tarifa.plan_id),
    tarifa.plan_nombre]));
  return <div className="admin-directory">
      <p className="admin-directory__descripcion">Gestioná el ciclo de vida de las versiones del tarifario.</p>

      {aviso ? <AuthAlert tone={aviso.tone} title={aviso.title}>{aviso.message}</AuthAlert> : null}

      {cargando ? <LoadingState message="Cargando el historial de versiones..." /> : <>
            <div className="admin-card admin-table-wrap admin-vers-card admin-vers-card--historial">
            <div className="admin-vers__cabecera">
              <h2 className="admin-vers__titulo">Historial de versiones</h2>
              <div className="admin-vers__acciones">
                {(versiones ?? []).some(version => version.estado === 'CANCELADA') ? (
            /* Filtro especifico: las descartadas no se mezclan con
               las historicas por defecto; el filtro las agrega al
               final del orden principal (pendiente -> vigente ->
               historicas). */
            <button type="button" className={`admin-button admin-button--subtle${mostrarDescartadas
              ? ' admin-vers__filtro-activo' : ''}`} aria-pressed={mostrarDescartadas}
              title="Muestra u oculta las versiones descartadas del historial."
              onClick={() => setMostrarDescartadas(!mostrarDescartadas)}>
                    {mostrarDescartadas ? 'Ocultar descartadas' : 'Descartadas'}
                  </button>) : null}
                {permiteCopiar ? <button type="button" className="admin-button" disabled={operando}
                  onClick={() => void copiarBorrador()}>
                    Copiar versión como borrador
                  </button> : null}
              </div>
            </div>
            <div className="admin-table__scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Versión</th>
                    <th scope="col">Base</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Responsable</th>
                    <th scope="col">Creada</th>
                    <th scope="col">Activación</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(versiones ?? []).length === 0 ? <tr><td colSpan={7}
                    className="admin-table__empty">Sin versiones registradas.</td></tr> :
                    versionesOrdenadas.map(version => <tr key={version.id} className={[version.id === idParam
                    ? 'admin-vers__fila-elegida' : '', version.estado === 'ACTIVA' ? 'admin-vers__fila-activa' :
                    ''].filter(Boolean).join(' ')}>
                      <td>
                        #{version.id}
                        {version.estado === 'ACTIVA' ? <span className="admin-vers__vigente"
                          title="Esta es la versión vigente del tarifario.">
                            Vigente
                          </span> : null}
                      </td>
                      <td>{version.version_base_id ? `#${version.version_base_id}` : '—'}</td>
                      <td><ChipEstado estado={version.estado} /></td>
                      <td className="admin-table__texto">
                        {version.actor_legajo
                          ? `${version.actor_nombre ?? ''} ${version.actor_apellido ?? ''} (${version.actor_legajo})`.trim() : 'Sistema (carga inicial)'}
                      </td>
                      <td>{formatearFecha(version.created_at) || '—'}</td>
                      <td>{formatearFecha(version.fecha_activacion) || '—'}</td>
                      <td>
                        {/* Acción única por fila: compacta, uniforme y sin
                           quiebres; la recuperación vive solo en el panel
                           del detalle cuando la versión histórica está
                           seleccionada. */}
                        <button type="button"
                          className="admin-button admin-button--subtle admin-vers__ver-fila"
                          onClick={() => elegirVersion(version.id === idParam ? '' : String(version.id))}>
                          {version.id === idParam ? 'Cerrar' : 'Ver'}
                        </button>
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>
          </div>

          {versionDelDetalle
            ? <div className="admin-card admin-table-wrap admin-vers-card admin-vers-card--detalle">
              <div className="admin-vers__cabecera">
                <h2 className="admin-vers__titulo">
                  Versión #{versionDelDetalle.id} · {etiquetaEstado(versionDelDetalle.estado)}
                </h2>
                <div className="admin-vers__acciones">
                  {editable ? <>
                      {formAumento ? null : <button type="button" className="admin-button"
                        disabled={operando} onClick={() => setFormAumento({
                porcentaje: '',
                tipoIngreso: '',
                paso: 'carga'
              })}>
                          Aumento masivo
                        </button>}
                      <button type="button" className="admin-button admin-button--ghost"
                        disabled={operando} onClick={() => void finalizarEdicion()}>
                        Finalizar edición
                      </button>
                    </> : null}
                  {editable ? <button type="button" className="admin-button admin-button--subtle"
                    disabled={operando || !hayReversibles} title={hayReversibles
                    ? 'Restaura el último cambio económico guardado.' :
                    'No hay cambios económicos para deshacer todavía.'} onClick={() => setDeshacerArmado(true)}>
                      Deshacer último cambio
                    </button> : null}
                  {versionDelDetalle?.estado === 'HISTORICA' ? (
            /* La historica abierta se recupera como borrador: el
               panel queda solo lectura y la edicion ocurre sobre
               la copia nueva que crea el backend. */
            <button type="button" className="admin-button" disabled={operando}
              title={`Copia la versión #${versionDelDetalle.id} como nuevo borrador editable.`}
              onClick={() => void recuperarComoBorrador(versionDelDetalle)}>
                      Recuperar como borrador
                    </button>) : null}
                  {pendiente ? (
            /* Descarte de versiones pendientes: accion
               secundaria de caracter destructivo; pide
               confirmacion y motivo antes de operar. */
            <button type="button" className="admin-button admin-button--peligro"
              disabled={operando} onClick={() => setDescarteArmado(true)}>
                      Descartar versión
                    </button>) : null}
                  {activable ? <>
                      <button type="button" className="admin-button" disabled={operando}
                        onClick={() => void activarBorrador()}>
                        Activar versión
                      </button>
                      <button type="button" className="admin-button admin-button--subtle"
                        disabled={operando} onClick={() => setReanudarArmado(true)}>
                        Volver a edición
                      </button>
                    </> : null}
                </div>
              </div>

              {reanudarArmado && activable ? <div className="admin-vers__confirmar">
                  <p>
                    La versión volverá a preparación para seguir corrigiendo
                    precios: se conservan todos los valores y la auditoría.
                    Otras administraciones concurrentes siguen viendo la
                    revisión vigente.
                  </p>
                  <button type="button" className="admin-button" disabled={operando}
                    onClick={() => void volverAEdicion()}>
                    Sí, volver a edición
                  </button>
                  <button type="button" className="admin-button admin-button--ghost"
                    disabled={operando} onClick={() => setReanudarArmado(false)}>
                    No, volver
                  </button>
                </div> : null}

              {descarteArmado && pendiente
                ? <div className="admin-vers__confirmar admin-vers__confirmar-descarte">
                  <p>
                    La versión #{versionDelDetalle.id} quedará fuera del
                    ciclo: se conservan todos sus precios y su auditoría,
                    pero ya no podrá editarse ni activarse. La versión
                    vigente y la numeración no cambian.
                  </p>
                  <label className="admin-field admin-vers__campo-descarte">
                    Motivo del descarte
                    <input type="text" required maxLength={200} value={motivoDescarte}
                      onChange={event => setMotivoDescarte(event.target.value)}
                      placeholder="Por ejemplo: el cliente no aprobó la lista." disabled={operando} />
                  </label>
                  <button type="button" className="admin-button admin-button--peligro"
                    disabled={operando || motivoDescarte.trim().length === 0} title={motivoDescarte.trim().length === 0
                    ? 'Ingresá el motivo antes de confirmar el descarte.' :
                    'Confirma el descarte con motivo registrado en la auditoría.'}
                    onClick={() => void ejecutarDescarte()}>
                    Sí, descartar
                  </button>
                  <button type="button" className="admin-button admin-button--ghost"
                    disabled={operando} onClick={() => setDescarteArmado(false)}>
                    No, volver
                  </button>
                </div> : null}

              {deshacerArmado && editable ? <div className="admin-vers__confirmar">
                  <p>
                    Se deshará el último cambio económico vigente y se restaurarán los
                    precios guardados en la auditoría. Otras administraciones concurrentes
                    siguen viendo la revisión vigente.
                  </p>
                  <button type="button" className="admin-button" disabled={operando}
                    onClick={() => void ejecutarDeshacer()}>
                    Sí, deshacer
                  </button>
                  <button type="button" className="admin-button admin-button--ghost"
                    disabled={operando} onClick={() => setDeshacerArmado(false)}>
                    No, volver
                  </button>
                </div> : null}

              {formAumento && editable ? <form className="admin-vers__formu" onSubmit={event => {
                event.preventDefault();
                if (formAumento.paso === 'carga') irAConfirmacionAumento();
              }}>
                  <label className="admin-field">
                    Porcentaje
                    <input type="number" step="0.01" min="0.01" max="99.99" required
                      value={formAumento.porcentaje} onChange={event => setFormAumento({
                        ...formAumento,
                        porcentaje: event.target.value
                      })} />
                  </label>
                  <label className="admin-field">
                    Modalidad
                    <select value={formAumento.tipoIngreso} onChange={event => setFormAumento({
                        ...formAumento,
                        tipoIngreso: event.target.value
                      })}>
                      <option value="">Ambas</option>
                      <option value="Obligatorio">Obligatorio</option>
                      <option value="Voluntario">Voluntario</option>
                    </select>
                  </label>
                  {formAumento.paso === 'carga' ? <button type="submit" className="admin-button"
                    disabled={operando}>Revisar aumento</button> : null}
                  <button type="button" className="admin-button admin-button--ghost"
                    disabled={operando} onClick={() => setFormAumento(null)}>
                    Cancelar
                  </button>
                </form> : null}

              {formAumento?.paso === 'confirmacion'
                ? <div className="admin-vers__confirmacion-aumento">
                  <p>
                    Revisá el aumento antes de aplicarlo: porcentaje {formAumento.porcentaje}%
                    sobre {previaVisible?.filas.length ?? 0} fila(s) de modalidad
                    {formAumento.tipoIngreso ? ` ${formAumento.tipoIngreso}` :
                      ' Obligatorio y Voluntario'}.
                  </p>
                  {previaEstado === 'cargando' || previaEstado === 'error' || !previaVisible
                    ? <p role={previaEstado === 'error' ? 'alert' : 'status'}>
                      {previaEstado === 'cargando'
                        ? 'Calculando la previsualización en el servidor...' : previaEstado === 'error'
                        ? 'No hay previsualización disponible: revisá el aviso y reintenta.' :
                        'Previsualización no calculada todavía.'}
                    </p> : <div className="admin-table__scroll admin-vers__previa-scroll">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th scope="col">Plan</th>
                            <th scope="col">Modalidad</th>
                            <th scope="col">Rango</th>
                            <th scope="col">Precio actual</th>
                            <th scope="col">Precio nuevo</th>
                            <th scope="col">Diferencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previaVisible.filas.map(fila => <tr key={fila.id}>
                              <td>{fila.plan_nombre}</td>
                              <td className="admin-table__texto">{fila.tipo_ingreso}</td>
                              <td>{fila.rango_clave}{fila.rango_nota ? ` ${fila.rango_nota}` :
                                ''}</td>
                              <td className="admin-table__precio">{formatearPrecioARS(fila.precio_anterior)}</td>
                              <td className="admin-table__precio">{formatearPrecioARS(fila.precio_nuevo)}</td>
                              <td className="admin-table__precio">+{formatearPrecioARS(fila.incremento)}</td>
                            </tr>)}
                        </tbody>
                      </table>
                    </div>}
                  <button type="button" className="admin-button" disabled={operando
                    || !previaVisible} onClick={() => void confirmarAumento()}>
                    Confirmar aumento
                  </button>
                  <button type="button" className="admin-button admin-button--ghost"
                    disabled={operando} onClick={() => setFormAumento(null)}>
                    Cancelar
                  </button>
                </div> : null}

              <div className="admin-table__scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Plan</th>
                      <th scope="col">Modalidad</th>
                      <th scope="col">Rango</th>
                      <th scope="col" className="admin-table__precio">Precio</th>
                      <th scope="col">Vigente</th>
                      {editable
                        ? <th scope="col"><span className="admin-visually-hidden">Acciones</span></th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {detalle.tarifas.length === 0 ? <tr><td colSpan={editable ? 6 : 5}
                      className="admin-table__empty">La versión no tiene filas de tarifas.</td></tr> :
                      detalle.tarifas.map(tarifa => <tr key={tarifa.id}>
                        <td>{tarifa.plan_nombre}</td>
                        <td className="admin-table__texto">{tarifa.tipo_ingreso}</td>
                        <td>{tarifa.rango_clave}{tarifa.rango_nota ? ` ${tarifa.rango_nota}` :
                          ''}</td>
                        <td className="admin-table__precio">{formatearPrecioARS(tarifa.precio)}</td>
                        <td className="admin-table__texto">{tarifa.activa ? 'Activa' : '—'}</td>
                        {editable ? <td>
                            {edicion?.tarifaId === String(tarifa.id) ? (
                  /* Única fila en modo edición: el input nace con
                     el precio real de ESTA tarifa; Guardar y
                     Cancelar pertenecen solo a esta fila. */
                  <>
                                <input type="text" inputMode="decimal"
                                  aria-label={`Precio nuevo de ${tarifa.rango_clave}`} required value={edicion.precio}
                                  onChange={event => setEdicion({
                      ...edicion,
                      precio: event.target.value
                    })} />
                                <button type="button" className="admin-button admin-button--subtle"
                                  disabled={operando} onClick={() => void guardarPrecio(tarifa)}>
                                  Guardar
                                </button>
                                <button type="button" className="admin-button admin-button--ghost"
                                  disabled={operando} onClick={cancelarEdicion}>
                                  Cancelar
                                </button>
                              </>) : (
                  /* Las demás filas permanecen en lectura; abrir otra
                     edición cierra la actual sin guardar. */
                  <button type="button" className="admin-button admin-button--subtle"
                    disabled={operando} onClick={() => abrirEdicion(tarifa)}>
                                Editar
                              </button>)}
                          </td> : null}
                      </tr>)}
                  </tbody>
                </table>
              </div>

              <div className="admin-resumen" data-testid="resumen-cambios">
                <h3 className="admin-resumen__titulo">Resumen de cambios</h3>
                {(resumen?.eventos ?? []).length === 0
                  ? <p className="admin-resumen__vacio">Sin cambios registrados.</p> :
                  <ul className="admin-resumen__lista">
                    {(resumen?.eventos ?? []).map(evento => <li key={evento.id}
                      className="admin-resumen__item">
                        <div className="admin-resumen__linea">
                          <span className="admin-resumen__tipo">{etiquetaDeEvento(evento)}</span>
                          <span className="admin-resumen__texto">{textoDeEvento(evento,
                            mapaNombresPlan, resumen?.eventos ?? [])}</span>
                        </div>
                        <span className="admin-resumen__meta">
                          {actorDeEvento(evento)} · {formatearFecha(evento.evento_en)}
                        </span>
                      </li>)}
                  </ul>}
              </div>
            </div> : null}
        </>}
    </div>;
}
