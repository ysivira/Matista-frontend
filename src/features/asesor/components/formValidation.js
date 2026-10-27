/**
 * MATISTA - Frontend · Asesor comercial
 * Archivo: formValidation.js
 *
 * RESPONSABILIDAD:
 * Componente formValidation del módulo Asesor comercial; unidad de interfaz reutilizable de la
 * feature.
 *
 * CONTENIDO:
 * - Función enfocarPrimerError.
 * - Función revisarCampo.
 * - Función revisarFormulario.
 */
/** Enfoca el primer control inválido, nunca un fieldset contenedor; incluye errores comerciales remotos. */
import { esTelefonoValido, TELEFONO_MENSAJE } from '../../../shared/lib/telefono.js';

export function enfocarPrimerError(form) {
  const control = form?.querySelector('input[aria-invalid="true"],select[aria-invalid="true"],textarea[aria-invalid="true"],input:invalid,select:invalid,textarea:invalid');
  if (control) {
    control.focus({
      preventScroll: true
    });
    control.scrollIntoView?.({
      behavior: 'smooth',
      block: 'center'
    });
  }
  return control;
}

/** Revisa restricciones de formato; editando retira feedback de campos diferidos hasta blur/avance, sin reglas comerciales. */
export function revisarCampo(control, editando = false) {
  if (!control?.validity || control.dataset.comercial || control.disabled
    || control.readOnly) return;
  const label = control.closest('label,.ase-field') ?? control.parentElement;
  if (!label) return;
  if (control.dataset.enteroNoNegativo) {
    const entero = /^\d+$/.test(control.value) && Number.isSafeInteger(Number(control.value));
    control.setCustomValidity(!editando && control.value !== '' && !entero
      ? 'Ingrese una cantidad entera mayor o igual que cero.' : '');
  }
  // SPEC-28: teléfono opcional; con contenido se exige un valor telefónico
  // válido (misma regla que el backend). Vacío no produce error.
  if (control.dataset.telefono) {
    const valido = esTelefonoValido(control.value);
    control.setCustomValidity(!editando && control.value !== '' && !valido
      ? TELEFONO_MENSAJE : '');
  }
  let mensaje = '';
  const v = control.validity;
  if (v.valueMissing) mensaje = 'Complete este campo obligatorio.';
  else if (v.typeMismatch) mensaje = 'Ingrese un correo electrónico válido.';
  else if (v.rangeUnderflow) mensaje = `El mínimo permitido es ${control.min}.`;
  else if (v.rangeOverflow) mensaje = `El máximo permitido es ${control.max}.`;
  else if (v.stepMismatch) mensaje = 'Ingrese un número entero.';
  else if (v.patternMismatch || v.customError) mensaje = control.dataset.enteroNoNegativo
    ? 'Ingrese una cantidad entera mayor o igual que cero.'
    : control.dataset.telefono ? TELEFONO_MENSAJE
    : 'Ingrese un importe sin separadores de miles y con hasta dos decimales.';
  else if (!v.valid) mensaje = 'Revise el valor ingresado.';
  if (editando) mensaje = '';
  // Este nodo de feedback pertenece al validador nativo; no modifica el valor controlado por React.
  let feedback = label.querySelector('[data-native-feedback]');
  if (mensaje && !feedback) {
    if (!control.getAttribute('aria-label')
      && !control.getAttribute('aria-labelledby')) control.setAttribute('aria-label',
      label.textContent.trim());
    feedback = document.createElement('small');
    feedback.dataset.nativeFeedback = 'true';
    feedback.className = 'ase-field-error';
    label.append(feedback);
  }
  if (feedback) {
    feedback.textContent = mensaje;
    feedback.hidden = !mensaje;
  }
  control.setAttribute('aria-invalid', String(Boolean(mensaje)));
  control.dataset.nativeError = mensaje ? 'true' : '';
  const seccion = control.closest('.ase-config-card');
  if (seccion) {
    const invalida = Boolean(seccion.querySelector('[data-native-error="true"]'));
    seccion.classList.toggle('ase-native-invalid-section', invalida);
    let resumen = seccion.querySelector('[data-native-summary]');
    if (invalida && !resumen) {
      resumen = document.createElement('p');
      resumen.dataset.nativeSummary = 'true';
      resumen.className = 'ase-field-error';
      resumen.setAttribute('role', 'alert');
      seccion.append(resumen);
    }
    if (resumen) {
      resumen.textContent = invalida ? 'Revise los campos señalados de esta sección.' : '';
      resumen.hidden = !invalida;
    }
  }
}

/** Verifica todos los controles al avanzar, para señalar secciones fuera de pantalla sin perder entradas. */
export function revisarFormulario(form) {
  for (const control of form?.querySelectorAll('input,select,textarea') ?? []) revisarCampo(control);
  const valido = form?.checkValidity() ?? true;
  if (!valido) enfocarPrimerError(form);
  return valido;
}
