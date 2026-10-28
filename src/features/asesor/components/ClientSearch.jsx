/**
 * ============================================================
 * MATISTA | BÚSQUEDA E IDENTIDAD DE CLIENTES
 * ============================================================
 *
 * Archivo: ClientSearch.jsx
 * Módulo: Asesor
 *
 * Responsabilidad:
 * Buscar por DNI, registrar o editar identidad y contacto y entregar
 * el cliente seleccionado con la edad declarada para cotizar.
 *
 * CONTENIDO:
 * - Función ClientSearch.
 *
 * DEPENDENCIAS:
 * - react
 * - react-router-dom
 * - ../api/asesorApi.js
 * - ../../../shared/lib/edad.js
 * - ./AsesorDialog.jsx
 * - ./formValidation.js
 *
 * ============================================================
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { consultarAsesor, guardarAsesor } from '../api/asesorApi.js';
import { calcularEdad } from '../../../shared/lib/edad.js';
import { esTelefonoValido } from '../../../shared/lib/telefono.js';
import { AsesorDialog } from './AsesorDialog.jsx';
import { revisarCampo } from './formValidation.js';
const VACIO = {
  nombres: '',
  apellidos: '',
  email: '',
  telefono: '',
  provincia: '',
  localidad: ''
};

/** Campo de identidad/contacto; el asterisco representa únicamente una obligación real del contrato. */
function Campo({
  nombre,
  titulo,
  datos,
  cambiar,
  requerido = false,
  tipo = 'text',
  max = 100,
  ayuda,
  telefono = false
}) {
  const icono = {
    nombres: 'person',
    apellidos: 'badge',
    fecha_nacimiento: 'calendar_today',
    email: 'mail',
    telefono: 'call',
    provincia: 'map',
    localidad: 'location_on'
  }[nombre];
  return <div className="ase-field">
    <div className="ase-field-row">
      <label htmlFor={`ase-cliente-${nombre}`}>{titulo}{requerido && <span aria-hidden="true"> *</span>}</label>
    </div>
    <div className="ase-input-shell">
      <span className="ase-symbol" aria-hidden="true">{icono}</span>
      <input
        id={`ase-cliente-${nombre}`}
        aria-label={titulo}
        required={requerido}
        type={tipo}
        maxLength={max}
        /* Validación telefónica compartida con el backend: el mecanismo
           nativo (data-telefono + revisarCampo) muestra el error junto al
           campo y bloquea el avance. */
        data-telefono={telefono || undefined}
        inputMode={telefono ? 'tel' : undefined}
        max={tipo === 'date' ? new Date().toISOString().slice(0, 10) : undefined}
        value={datos[nombre] ?? ''}
        onChange={e => {
          // Al editar el teléfono se reevalúa la regla en modo editando
          // (retira el error retenido por setCustomValidity); el
          // blur/avance la reevalúa completa.
          if (telefono) revisarCampo(e.target, true);
          cambiar(nombre, e.target.value);
        }}
      />
    </div>
    {ayuda && <small className="ase-client-help">{ayuda}</small>}
  </div>;
}

/**
 * Paso 1 Stitch: persiste identidad/contacto y entrega edad declarada para el snapshot de
 * cotización, sin inventar nacimiento.
 * @param {object} props onSelect entrega un cliente persistido; initialCliente conserva la
 * selección anterior.
 * Los errores dejan el formulario intacto. Dirección histórica viaja sin editarse ni mostrarse.
 */
export function ClientSearch({
  onSelect,
  initialCliente = null,
  bloquearIdentidad = false
}) {
  const navigate = useNavigate();
  const [dni, setDni] = useState(initialCliente?.dni ?? '');
  const [cliente, setCliente] = useState(initialCliente);
  const [registrado, setRegistrado] = useState(initialCliente);
  const [ajeno, setAjeno] = useState(null);
  const [aviso, setAviso] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [edadDeclarada,
    setEdadDeclarada] = useState(initialCliente?.edad_declarada ?? calcularEdad(initialCliente?.fecha_nacimiento) ?? '');
  const datos = cliente ?? VACIO;
  const editado = registrado
    && Object.keys(VACIO).some(k => (datos[k] ?? '') !== (registrado[k] ?? ''));
  const completo = Boolean(cliente && datos.nombres?.trim() && datos.apellidos?.trim()
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email ?? '') && Number.isInteger(edadDeclarada)
    && edadDeclarada >= 0 && edadDeclarada <= 120
    // El teléfono sigue siendo opcional; con contenido inválido no se
    // avanza de paso (misma regla que aplica el backend al guardar).
    && esTelefonoValido(datos.telefono ?? ''));
  /** Descarta identidad previa y resuelve propiedad desde el servidor, sin guardar un prospecto. */
  async function buscar(e) {
    e.preventDefault();
    setBusy(true);
    setAviso('');
    setAjeno(null);
    setCliente(null);
    setRegistrado(null);
    try {
      const r = await consultarAsesor(`clientes/busqueda/${encodeURIComponent(dni)}`);
      if (r.encontrado && !r.autorizado) setAjeno(r);
      else {
        setCliente(r.cliente ?? {
          ...VACIO,
          dni
        });
        setRegistrado(r.cliente ?? null);
        setEdadDeclarada(r.cliente?.edad_declarada ?? calcularEdad(r.cliente?.fecha_nacimiento) ?? '');
        setConfirmar(Boolean(r.cliente));
      }
    } catch (error) {
      setAviso(error.message);
    } finally {
      setBusy(false);
    }
  }
  /**
   * Actualiza el campo indicado con el texto del input; solo nombres/apellidos pasan a mayúsculas.
   * Conserva tildes, Ñ, otros campos y revisión; no persiste hasta guardar explícitamente.
   */
  function cambiar(campo, valor) {
    const normalizado = ['nombres', 'apellidos'].includes(campo) ? valor.toUpperCase() : valor;
    setCliente(actual => ({
      ...actual,
      [campo]: normalizado
    }));
  }
  /** Limpia la búsqueda actual sin escribir en la base. */
  function nuevaBusqueda() {
    setDni('');
    setCliente(null);
    setRegistrado(null);
    setAjeno(null);
    setAviso('');
    setConfirmar(false);
    setEdadDeclarada('');
  }
  /** Guarda solo si hay cambios; reutiliza el registro propio sin crear revisiones innecesarias. */
  async function guardar(e) {
    e.preventDefault();
    if (!completo || !e.currentTarget.reportValidity()) return;
    if (onSelect && registrado && !editado) {
      onSelect({
        ...registrado,
        edad_declarada: edadDeclarada
      });
      return;
    }
    setBusy(true);
    setAviso('');
    try {
      const body = Object.fromEntries(['dni', ...Object.keys(VACIO)].map(k => [k,
        cliente[k] ?? null]));
      // Dirección no forma parte de la interfaz; conserva exactamente el dato anterior.
      if (cliente.id) {
        body.revision = cliente.revision;
        body.direccion = cliente.direccion ?? null;
      }
      const r = await guardarAsesor(cliente.id ? `clientes/${cliente.id}` : 'clientes', body,
        cliente.id ? 'PUT' : 'POST');
      setCliente(r);
      setRegistrado(r);
      setAviso('Cliente guardado.');
      onSelect?.({
        ...r,
        edad_declarada: edadDeclarada
      });
    } catch (error) {
      setAviso(error.message);
    } finally {
      setBusy(false);
    }
  }
  return <section className="ase-panel ase-client-card ase-client-step">
    <div className="ase-step-header">
      <div className="ase-section-heading">
        <span><span className="ase-symbol" aria-hidden="true">account_circle</span></span>
        <div>
          <h3>Datos del Cliente</h3>
          <p>Ingrese un DNI para comenzar la búsqueda en el registro central o registrar manualmente un nuevo prospecto.</p>
        </div>
      </div>
      <span className={`ase-pill${registrado ? ' ase-pill--ok' : ''}`}><span className="ase-pill-dot" />{registrado ? 'Cliente recuperado' : cliente ? 'Nuevo Prospecto' : 'Formulario Activo'}</span>
    </div>
    <h4 className="ase-client-section-title">1. Identificación Personal</h4>
    <form onSubmit={buscar} className="ase-search">
      <div className="ase-field">
        <div className="ase-field-row">
          <label htmlFor="ase-busqueda-dni">Documento (DNI) <span aria-hidden="true">*</span></label>
          <span className="ase-field-hint">Presione Enter o Buscar en registro central</span>
        </div>
        <div className="ase-input-shell">
          <span className="ase-symbol" aria-hidden="true">badge</span>
          <input
            id="ase-busqueda-dni"
            aria-label="DNI"
            required
            inputMode="numeric"
            pattern="[0-9]{7,10}"
            disabled={busy || bloquearIdentidad}
            value={dni}
            onChange={e => {
            setDni(e.target.value);
            setCliente(null);
            setRegistrado(null);
            setAjeno(null);
            }}
          />
          <button disabled={busy || bloquearIdentidad}
            aria-label="Buscar cliente"><span className="ase-symbol"
            aria-hidden="true">search</span>Buscar</button>
        </div>
        <small className="ase-client-help">{bloquearIdentidad ? 'El cliente de una cotización persistida no se sustituye.' : 'Sin puntos ni espacios.'}</small>
      </div>
    </form>
    {aviso && <p role="alert" className="ase-notice">{aviso}</p>}
    {ajeno && <AsesorDialog title="Cliente registrado por otro asesor" onClose={nuevaBusqueda}
      footer={<><button type="button" className="ase-secondary"
      onClick={nuevaBusqueda}>Cerrar</button><button type="button"
      onClick={nuevaBusqueda}>Realizar otra búsqueda</button></>}>
      <div className="ase-restricted">
        <p>El DNI consultado ya se encuentra registrado en MATISTA y está asociado a otro asesor comercial.</p>
        <dl className="ase-money-list">
          <div>
            <dt>DNI consultado</dt>
            <dd>{dni}</dd>
          </div>
          <div>
            <dt>Asesor responsable</dt>
            <dd>{ajeno.asesor}</dd>
          </div>
          <div>
            <dt>Fecha de registro</dt>
            <dd>{new Date(ajeno.registrado_at).toLocaleDateString('es-AR')}</dd>
          </div>
        </dl>
        <p role="alert" className="ase-notice">Cliente registrado por {ajeno.asesor}. No está autorizado para editar sus datos ni generar una cotización desde su cuenta.</p>
      </div>
    </AsesorDialog>}
    {confirmar && cliente && <AsesorDialog title="Cliente encontrado en MATISTA"
      onClose={nuevaBusqueda} footer={<><button type="button" className="ase-secondary"
      onClick={nuevaBusqueda}>Cancelar</button><button type="button"
      onClick={() => setConfirmar(false)}>Cargar datos</button></>}>
      <div className="ase-client-confirm">
        <p>Se han recuperado los datos personales asociados al DNI {dni}. ¿Desea aplicar estos datos a la cotización?</p>
        <dl className="ase-money-list">
          <div>
            <dt>Titular</dt>
            <dd>{cliente.nombres} {cliente.apellidos}{edadDeclarada !== '' ? ` (${edadDeclarada} años)` : ''}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{cliente.email || 'Sin registrar'}</dd>
          </div>
          <div>
            <dt>Zona</dt>
            <dd>{[cliente.localidad, cliente.provincia].filter(Boolean).join(', ') || 'Sin registrar'}</dd>
          </div>
        </dl>
      </div>
    </AsesorDialog>}
    {cliente && <div role="status" className={`ase-client-status${registrado ? '' :
      ' ase-client-status--nuevo'}`}><strong>{registrado
      ? 'Cliente encontrado. Se recuperaron sus datos del registro central.' :
      'No encontramos un cliente registrado con este DNI'}</strong><p>{registrado
      ? 'Registro interno propio. No implica verificación externa de identidad.' :
      'Completá los datos para continuar con una nueva cotización.'}</p></div>}
    {!ajeno && <form onSubmit={guardar} onBlurCapture={e => revisarCampo(e.target)}
      onInputCapture={e => {
        // El teléfono revisa en cada edición: modo editando retira el error
        // retenido por setCustomValidity y reevalúa la regla compartida.
        if (e.target.dataset.telefono) revisarCampo(e.target, true);
        else if (e.target.validity?.valid) revisarCampo(e.target);
      }} id="ase-form-cliente">
      <fieldset disabled={!cliente || busy} className="ase-client-fields">
        <div className="ase-grid">
          <Campo nombre="nombres" titulo="Nombres" datos={datos} cambiar={cambiar} requerido />
          <Campo nombre="apellidos" titulo="Apellidos" datos={datos} cambiar={cambiar} requerido />
          <div className="ase-field">
            <div className="ase-field-row">
              <label htmlFor="ase-cliente-edad">Edad <span aria-hidden="true">*</span></label>
              <span className="ase-field-hint">Años cumplidos declarados</span>
            </div>
            <div className="ase-input-shell">
              <span className="ase-symbol" aria-hidden="true">cake</span>
              <input
                id="ase-cliente-edad"
                aria-label="Edad"
                type="number"
                required
                min="0"
                max="120"
                step="1"
                value={edadDeclarada}
                onChange={e => setEdadDeclarada(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <span className="ase-age-unit">años</span>
            </div>
            <small className="ase-client-help">Se guarda en la cotización; no se genera una fecha de nacimiento.</small>
          </div>
        </div>
        <h4 className="ase-client-section-title">2. Datos de Contacto y Ubicación</h4>
        <div className="ase-grid">
          <Campo nombre="email" titulo="Correo electrónico" datos={datos} cambiar={cambiar} requerido
            tipo="email" max={254} ayuda="Para enviar el PDF formal y cotización" />
          <Campo nombre="telefono" titulo="Teléfono" datos={datos} cambiar={cambiar} tipo="tel"
            telefono max={40} ayuda="Línea directa de contacto · opcional" />
          <Campo nombre="provincia" titulo="Provincia" datos={datos} cambiar={cambiar} max={80} />
          <Campo nombre="localidad" titulo="Localidad" datos={datos} cambiar={cambiar} max={80} />
        </div>
      </fieldset>
      <p className="ase-info-panel">Los campos señalados con asterisco (*) son de carácter obligatorio para calcular el cuadro tarifario y derivación de aportes en el siguiente paso.</p>
      <div className="ase-actions">
        <button type="button" className="ase-secondary"
          onClick={() => navigate('/asesor')}>Cancelar operación</button>
        <div>
          <button disabled={busy || !completo}>{onSelect
            ? 'Siguiente: Configurar Cotización' : 'Guardar cliente'}</button>
          {!completo && <small>Complete los campos obligatorios para continuar</small>}
        </div>
      </div>
    </form>}
    {cliente && !bloquearIdentidad && <button type="button" className="ase-text-button"
      onClick={nuevaBusqueda}>Cambiar DNI / Nueva búsqueda</button>}
  </section>;
}
