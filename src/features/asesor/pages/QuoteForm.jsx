/**
 * MATISTA - Frontend · Asesor comercial
 * Archivo: QuoteForm.jsx
 *
 * RESPONSABILIDAD:
 * Página QuoteForm del módulo Asesor comercial; compone componentes de la feature para su caso de
 * uso.
 *
 * CONTENIDO:
 * - Función QuoteForm.
 *
 * DEPENDENCIAS:
 * - react
 * - react-router-dom
 * - ../../auth/context/SessionContext.js
 * - ../components/ClientSearch.jsx
 * - ../components/FamilyGroupEditor.jsx
 * - ../components/DiscountSelector.jsx
 * - ../components/EconomicPreview.jsx
 * - ../components/QuoteReview.jsx
 * - ../../../shared/lib/formatoMonetario.js
 * - ../api/asesorApi.js
 * - ../hooks/useAsesorConsulta.js
 * - ../../../shared/lib/edad.js
 * - ../hooks/useCommercialValidation.js
 * - ../components/formValidation.js
 * - ../stitch.css
 */
import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { SessionContext } from '../../auth/context/SessionContext.js';
import { ClientSearch } from '../components/ClientSearch.jsx';
import { FamilyGroupEditor } from '../components/FamilyGroupEditor.jsx';
import { DiscountSelector } from '../components/DiscountSelector.jsx';
import { EconomicPreview } from '../components/EconomicPreview.jsx';
import { QuoteReview } from '../components/QuoteReview.jsx';
import { formatearPrecioARS } from '../../../shared/lib/formatoMonetario.js';
import { guardarAsesor } from '../api/asesorApi.js';
import { useAsesorConsulta } from '../hooks/useAsesorConsulta.js';
import { calcularEdad } from '../../../shared/lib/edad.js';
import { useCommercialValidation } from '../hooks/useCommercialValidation.js';
import { revisarCampo, revisarFormulario,
  enfocarPrimerError } from '../components/formValidation.js';
import '../stitch.css';

/** Carga catálogo, condiciones y cliente actual antes de montar la preparación, sin alterar snapshots. */
export function QuoteForm({
  recotizar = false
}) {
  const {
    id
  } = useParams();
  const [search] = useSearchParams();
  const condiciones = useAsesorConsulta('condiciones');
  const planes = useAsesorConsulta('planes');
  const inicial = useAsesorConsulta(id ? `cotizaciones/${id}` : search.get('cliente')
    ? `clientes/${encodeURIComponent(search.get('cliente'))}` : null);
  const personal = useAsesorConsulta(id && inicial.data?.cliente_id
    ? `clientes/${inicial.data.cliente_id}` : null);
  if (condiciones.loading || planes.loading || inicial.loading
    || personal.loading) return <p role="status">Preparando formulario...</p>;
  const error = condiciones.error || planes.error || inicial.error || personal.error;
  if (error) return <p role="alert">{error}</p>;
  return <QuoteWizard key={`${id ?? 'nueva'}-${recotizar}`} planes={planes.data.planes}
    configuracion={condiciones.data} origen={id ? inicial.data : null} clienteInicial={id
    ? personal.data : search.get('cliente') ? inicial.data : null} recotizar={recotizar} />;
}

/** Asistente Stitch con estado compartido, previsualización efímera y emisión autoritativa mediante huella. */
function QuoteWizard({
  planes,
  configuracion,
  origen,
  clienteInicial,
  recotizar
}) {
  const navigate = useNavigate();
  const user = useContext(SessionContext)?.user;
  const form = useRef(null);
  const emisionEnCurso = useRef(false);
  const enfocarPendiente = useRef(false);
  const [cliente, setCliente] = useState(clienteInicial);
  const [paso, setPaso] = useState(origen || clienteInicial ? 2 : 1);
  const [entrada, setEntrada] = useState(origen ? {
    ...origen.solicitud.entrada,
    condiciones: {
      ...origen.solicitud.entrada.condiciones,
      esquema:
        origen.solicitud.entrada.condiciones.esquema ?? (origen.solicitud.entrada.condiciones.tramos.length > 1 ? 'TRAMOS' : 'FIJO')
    }
  } : {
    cliente_id: clienteInicial ? String(clienteInicial.id) : '',
    plan_id: '',
    modalidad: 'Voluntario',
    familia: {
      titular: {
        edad:
          clienteInicial?.edad_declarada ?? calcularEdad(clienteInicial?.fecha_nacimiento) ?? '',
        estado_civil: 'SOLTERO'
      },
      miembros: []
    },
    aportes: {},
    condiciones: {
      esquema: 'TRAMOS',
      tramos: [],
      tdc: false,
      beneficios: {
        solicita_afinidad: false
      }
    }
  });
  const [aviso, setAviso] = useState('');
  const [busy, setBusy] = useState(false);
  const [borrador, setBorrador] = useState(recotizar ? null : origen);
  const [calculo, setCalculo] = useState(null);
  const [vista, setVista] = useState(null);
  const validacion = useCommercialValidation(entrada.familia);
  const [errorServidor, setErrorServidor] = useState(null);
  // El foco se aplica después de rehabilitar el fieldset; no depende de un temporizador que pueda
  // adelantarse al render.
  useEffect(() => {
    if (busy || paso !== 2 || !enfocarPendiente.current) return;
    enfocarPendiente.current = false;
    if (enfocarPrimerError(form.current)) return;
    const seccion = form.current?.querySelector(`[data-section="${errorServidor?.seccion ?? 'condiciones'}"]`) ?? form.current?.querySelector('.ase-discounts');
    seccion?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'center'
    });
    const control = seccion?.querySelector('input:not([readonly]),select') ?? seccion;
    control?.focus({
      preventScroll: true
    });
  }, [busy, paso, errorServidor]);
  const efectiva = entrada;
  const aporteVista = vista?.clave === JSON.stringify(efectiva)
    ? vista.resultado.aportes?.[0]?.importe : null;
  /** Selecciona el cliente persistido; volver al mismo titular conserva integrantes y opciones. */
  function seleccionar(c) {
    setCliente(c);
    setEntrada(actual => ({
      ...actual,
      cliente_id: String(c.id),
      familia: String(c.id) === actual.cliente_id ? {
        ...actual.familia,
        titular: {
          ...actual.familia.titular,
          edad: c.edad_declarada ?? actual.familia.titular.edad
        }
      } : {
        titular: {
          edad: c.edad_declarada ?? calcularEdad(c.fecha_nacimiento) ?? '',
          estado_civil: 'SOLTERO'
        },
        miembros: []
      }
    }));
    setCalculo(null);
    setPaso(2);
  }
  /** Invalida el cálculo; cambiar familia revalida la campaña con contexto joven sin alterar descuentos elegidos. */
  function cambiar(campo, valor) {
    setCalculo(null);
    setErrorServidor(actual => actual && actual.seccion !== 'motor' && actual.seccion !== ({
      aportes: 'modalidad',
      plan_id: 'plan'
    }[campo] ?? campo) ? actual : null);
    if (campo === 'condiciones') validacion.editar();
    if (campo === 'familia') {
      validacion.editar();
      void validacion.validar(entrada.condiciones, {
        familia: valor
      });
    }
    setEntrada(actual => ({
      ...actual,
      [campo]: valor,
      ...(campo === 'modalidad' ? {
        aportes: valor === 'Monotributo' ? {
          categoria: '',
          adherentes: 0
        } : {}
      } : {})
    }));
  }
  /** Confirma controles y política al avanzar; espera al servidor y enfoca el error ya renderizado. */
  async function validarAntesDeContinuar() {
    const nativo = revisarFormulario(form.current);
    const errores = await validacion.validar(entrada.condiciones, {
      todos: true
    });
    if (!nativo || errores === null || errores.length) {
      enfocarPendiente.current = true;
      setPaso(2);
      return false;
    }
    return true;
  }
  /** Ubica rechazos públicos del servidor en la sección correspondiente, sin mostrar trazas técnicas. */
  function mostrarError(error) {
    const detalles = Array.isArray(error.details) ? error.details : [];
    const campo = detalles[0]?.field ?? '';
    if (campo.startsWith('condiciones')) validacion.recibir(detalles);
    const seccion = campo.startsWith('condiciones') ? 'condiciones' : campo.startsWith('familia')
      ? 'familia' : campo.startsWith('aportes') ? 'modalidad' : campo === 'plan_id' ? 'plan' : 'motor';
    setErrorServidor({
      seccion,
      mensaje: error.message || 'No se pudo completar la operación. Reintente.'
    });
    enfocarPendiente.current = true;
    setPaso(2);
  }
  /** Persiste el mismo contrato existente y conserva revisión para reintentos y concurrencia. */
  async function persistir() {
    const ruta = borrador ? `cotizaciones/${borrador.id}` : origen && recotizar
      ? `cotizaciones/${origen.id}/recotizaciones` : 'cotizaciones';
    const q = await guardarAsesor(ruta, {
      ...efectiva,
      ...(borrador ? {
        revision: borrador.revision
      } : {})
    }, borrador ? 'PUT' : 'POST');
    setBorrador(q);
    return q;
  }
  /** Guarda y solicita el cálculo confirmable, sin usar la vista previa lateral como huella de emisión. */
  async function resumir(e) {
    e.preventDefault();
    setBusy(true);
    setAviso('');
    setCalculo(null);
    try {
      if (!(await validarAntesDeContinuar())) return;
      const q = await persistir();
      setCalculo(await guardarAsesor(`cotizaciones/${q.id}/calculo`, {}));
      setPaso(3);
    } catch (error) {
      mostrarError(error);
    } finally {
      setBusy(false);
    }
  }
  /** Conserva la preparación sin emitir y sin eludir la validación de los controles visibles. */
  async function guardar() {
    setBusy(true);
    setAviso('');
    try {
      if (!(await validarAntesDeContinuar())) return;
      const q = await persistir();
      navigate(`/asesor/cotizaciones/${q.id}`);
    } catch (error) {
      mostrarError(error);
    } finally {
      setBusy(false);
    }
  }
  /** Bloquea doble envío sin esperar al render y reemplaza el asistente por la confirmación releíble al actualizar. */
  async function emitir() {
    if (emisionEnCurso.current || !calculo || !borrador) return;
    emisionEnCurso.current = true;
    setBusy(true);
    setAviso('');
    try {
      if (!(await validarAntesDeContinuar())) return;
      const q = await guardarAsesor(`cotizaciones/${borrador.id}/emision`, {
        revision: calculo.revision,
        huella: calculo.huella
      });
      if (q.estado !== 'EMITIDA' || !q.id || !q.numero
        || !q.resultado) throw new Error('El servidor no confirmó la emisión. Consulte el historial antes de reintentar.');
      // La misma ruta de detalle relee el snapshot; una actualización de página no repite ningún
      // POST.
      navigate(`/asesor/cotizaciones/${q.id}`, {
        replace: true,
        state: {
          cotizacionConfirmada: true
        }
      });
    } catch (error) {
      mostrarError(error);
    } finally {
      emisionEnCurso.current = false;
      setBusy(false);
    }
  }
  const plan = planes.find(p => String(p.id) === String(entrada.plan_id));
  const solicitud = calculo?.solicitud ?? {
    cliente,
    entrada: efectiva,
    plan: {
      nombre: plan?.nombre ?? ''
    }
  };
  return <div className="ase-ui">
    <ol className="ase-stitch-stepper" aria-label="Progreso de la cotización">{['Datos del Cliente',
      'Configurar Cotización', 'Resumen y Emisión'].map((nombre, i) => <li key={nombre}
      className={paso > i + 1 ? 'is-done' : ''} aria-current={paso === i + 1 ? 'step' :
      undefined}>
        <span>{paso > i + 1 ? '✓' : i + 1}</span>
        <div>
          <small>PASO 0{i + 1}{paso === i + 1 ? ' • ACTIVO' : ''}</small>
          <strong>{nombre}</strong>
        </div>
      </li>)}
    </ol>
    {paso === 1 && <header className="ase-local-heading">
      <div>
        <p>NUEVA GESTIÓN</p>
        <h1>{recotizar
      ? 'Preparar Recotización' :
      'Nueva Cotización'}</h1>
        <p>El inicio ágil de cotizaciones centralizadas para clientes y nuevos prospectos.</p>
      </div>
      <span>Asignado a: <strong>{user ? `${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() : 'Sesión no disponible'}</strong></span>
    </header>}
    {aviso && <p role="alert" className="ase-notice">{aviso}</p>}
    {paso === 1 && <ClientSearch onSelect={seleccionar} initialCliente={cliente ? {
      ...cliente,
      edad_declarada: entrada.familia.titular.edad
    } : null} bloquearIdentidad={Boolean(origen || borrador)} />}
    {paso === 2 && <form ref={form} noValidate onInvalidCapture={e => e.preventDefault()}
      onBlurCapture={e => revisarCampo(e.target)} onInputCapture={e => {
        if (e.target.dataset.enteroNoNegativo) revisarCampo(e.target, true);
        else if (e.target.validity?.valid) revisarCampo(e.target);
      }} onSubmit={resumir} className="ase-workspace">
      <header className="ase-client-context">
        <span className="ase-avatar">{cliente?.nombres?.slice(0, 1)}{cliente?.apellidos?.slice(0, 1)}</span>
        <div>
          <h2>{cliente?.nombres} {cliente?.apellidos}</h2>
          <p>DNI: {cliente?.dni} · Edad: {efectiva.familia.titular.edad === '' ? 'Por completar' : efectiva.familia.titular.edad} años</p>
        </div>
        <div>
          <small>ASESOR COMERCIAL</small>
          <p>{user ? `${user.nombre ?? ''} ${user.apellido ?? ''}` : 'Según sesión'}{user?.legajo ? ` (Leg. ${user.legajo})` : ''}</p>
        </div>
      </header>
      <fieldset disabled={busy} className="ase-operation">
        <div className="ase-config-top">
          <div className="ase-config-primary">
            <section className="ase-config-card">
              <div className="ase-card-title">
                <h3><b>1</b> Plan de Salud</h3>
              </div>
              <label className="ase-sr-only" htmlFor="ase-plan">Plan de salud</label>
              <select id="ase-plan" required value={entrada.plan_id} onChange={e => cambiar('plan_id', e.target.value)}>
                <option value="">Selecciona un plan</option>
                {planes.filter(p => p.activa == null || Number(p.activa) === 1).map(p =>
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                )}
              </select>
            </section>
            <section className="ase-config-card">
              <div className="ase-card-title">
                <h3><b>2</b> Modalidad de Cotización</h3>
                <small>Régimen y aportes computables</small>
              </div>
              <div className="ase-segments" role="radiogroup" aria-label="Modalidad de afiliación">
                {['Voluntario', 'Obligatorio', 'Monotributo'].map(m =>
                  <label key={m} className={entrada.modalidad === m ? 'is-active' : ''}>
                    <input type="radio" name="modalidad" checked={entrada.modalidad === m} onChange={() => cambiar('modalidad', m)} />{m}
                  </label>
                )}
              </div>
              {entrada.modalidad === 'Voluntario'
                && <p className="ase-inset">Modalidad Particular / Pago Directo: Sin derivación ni afectación de aportes sindicales o de seguridad social. Se aplica la tarifa del plan y los impuestos vigentes.</p>}
              {entrada.modalidad === 'Obligatorio'
                && <div className="ase-inset">
                  <div className="ase-origin" role="radiogroup" aria-label="Origen del dato declarado">
                    <strong>Dato de estimación disponible:</strong>
                    {[
                      ['SUELDO', 'Sueldo Bruto'],
                      ['PERSONAL_RECIBO', 'Aporte personal del recibo (3 %)']
                    ].map(([valor, texto]) => <label key={valor}>
                      <input
                        type="radio"
                        name="origen-aporte"
                        checked={(entrada.aportes.opcion_aporte ?? 'SUELDO') === valor}
                        onChange={() => cambiar('aportes', {
                          opcion_aporte: valor
                        })}
                      />{texto}
                    </label>)}
                  </div>
                  <div className="ase-grid">
                    <label>{entrada.aportes.opcion_aporte === 'PERSONAL_RECIBO' ? 'Aporte personal del recibo (3 %)' : 'Sueldo bruto mensual declarado'}<input
                      required
                      inputMode="decimal"
                      pattern="[0-9]{1,12}(\.[0-9]{1,2})?"
                      value={(entrada.aportes.opcion_aporte === 'PERSONAL_RECIBO' ? entrada.aportes.aporte_personal : entrada.aportes.sueldo_bruto) ?? ''}
                      onChange={e => cambiar('aportes', entrada.aportes.opcion_aporte === 'PERSONAL_RECIBO' ? {
                        opcion_aporte: 'PERSONAL_RECIBO',
                        aporte_personal: e.target.value
                      } : {
                        opcion_aporte: 'SUELDO',
                        sueldo_bruto: e.target.value
                      })}
                    /></label>
                    <label>Aporte Computable Estimado<input
                      readOnly
                      value={aporteVista != null ? formatearPrecioARS(aporteVista) : 'Pendiente de cálculo'}
                    /></label>
                  </div>
                  <small>El aporte computable se calcula únicamente en el servidor según la política vigente.</small>
              </div>}
              {entrada.modalidad === 'Monotributo'
                && <div className="ase-inset ase-grid">
                  <label>Categoría de Monotributo<select
                    required
                    value={entrada.aportes.categoria ?? ''}
                    onChange={e => cambiar('aportes', {
                        ...entrada.aportes,
                        categoria: e.target.value
                    })}
                  >
                    <option value="">Selecciona</option>
                    {configuracion.categorias_monotributo?.map(c => <option key={c}>{c}</option>)}
                  </select></label>
                  <label>Cantidad de adherentes registrados en Monotributo<input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]+"
                    autoComplete="off"
                    data-entero-no-negativo="true"
                    required
                    value={entrada.aportes.adherentes ?? ''}
                    onChange={e => cambiar('aportes', {
                        ...entrada.aportes,
                        adherentes: /^\d+$/.test(e.target.value) ? Number(e.target.value) :
                          e.target.value
                    })}
                  /></label>
                  <small>Declare la cantidad registrada, aunque sea distinta de los familiares cotizados. Cero es válido.</small>
              </div>}
            </section>
            {errorServidor && ['modalidad', 'plan'].includes(errorServidor.seccion)
              && <p role="alert"
              className="ase-field-error">{errorServidor.mensaje}</p>}
          </div>
          <EconomicPreview
            entrada={efectiva}
            onResult={setVista}
            errorExterno={errorServidor?.seccion === 'motor' ? errorServidor.mensaje : null}
          />
        </div>
        <FamilyGroupEditor value={entrada.familia} cliente={cliente}
          errorServidor={errorServidor?.seccion === 'familia' ? errorServidor.mensaje : null}
          onChange={v => cambiar('familia', v)} />
        <DiscountSelector value={entrada.condiciones} politica={configuracion.politica}
          validacion={validacion} onChange={v => cambiar('condiciones', v)} />
      </fieldset>
      <footer className="ase-workspace-actions">
        <Link to="/asesor">Cancelar Cotización</Link>
        <div>
          <button type="button" disabled={busy} className="ase-secondary" onClick={() => setPaso(1)}>Volver a Datos del Cliente</button>
          <button type="button" className="ase-secondary" disabled={busy} onClick={guardar}>Guardar borrador</button>
          <button disabled={busy}>Continuar a Resumen y Emisión →</button>
        </div>
      </footer>
    </form>}
    {paso === 3 && calculo && <section className="ase-workspace ase-review">
      <header className="ase-review-header">
        <div>
          <h2>Previsualización de Cotización <span className="ase-pill">PASO 3 ACTIVO</span></h2>
          <p>Revise y valide minuciosamente las condiciones pactadas antes de emitir la propuesta oficial.</p>
        </div>
        <span className="ase-inset">Borrador no numerado • Estado preliminar</span>
      </header>
      <QuoteReview solicitud={solicitud} resultado={calculo.resultado} contacto={borrador?.contacto ?? cliente} />
      <footer className="ase-workspace-actions">
        <button className="ase-secondary" disabled={busy} onClick={() => setPaso(2)}>Volver a Configurar Cotización</button>
        <button disabled={busy} onClick={emitir}>{busy ? 'Procesando Emisión…' : 'Confirmar y Generar Cotización →'}</button>
      </footer>
    </section>}
  </div>;
}
