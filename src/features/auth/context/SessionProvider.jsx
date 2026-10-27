/**
 * MATISTA - Frontend · Autenticación
 * Archivo: SessionProvider.jsx
 *
 * RESPONSABILIDAD:
 * Contexto SessionProvider del módulo Autenticación; comparte estado de sesión entre componentes.
 *
 * CONTENIDO:
 * - Función SessionProvider.
 *
 * DEPENDENCIAS:
 * - react
 * - ../../../shared/lib/httpClient.js
 * - ../api/authApi.js
 * - ./SessionContext.js
 */
import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../shared/lib/httpClient.js';
import { authApi } from '../api/authApi.js';
import { SessionContext, SESSION_STATUS } from './SessionContext.js';
const SESSION_ABSENCE_CODES = new Set(['SESSION_REQUIRED', 'ACCESS_TOKEN_INVALID',
  'SESSION_INVALID']);

/**
 * Mensaje para rechazar una segunda mutación de sesión mientras otra está en curso.
 * Regla de negocio: solo una operación login/logout a la vez para evitar desincronizar
 * la cookie HttpOnly del servidor con el estado en memoria.
 */
const SESSION_MUTATION_IN_PROGRESS_MESSAGE = 'Ya existe una operación de inicio o cierre de sesión en curso.';

/**
 * Determina si el backend confirmó que no existe una sesión utilizable.
 * @param {unknown} error Error capturado al consultar la sesión.
 * @returns {boolean} true para los tres códigos 401 documentados por AUTH.
 */
function isSessionAbsence(error) {
  return error instanceof ApiError && error.status === 401 && SESSION_ABSENCE_CODES.has(error.code);
}

/**
 * Consulta la sesión actual y normaliza únicamente la ausencia contractual de sesión.
 * @param {object} authClient Operaciones AUTH inyectables.
 * @param {AbortSignal} [signal] Señal para cancelar el bootstrap desmontado.
 * @returns {Promise<{user: object|null, error: unknown|null}>} Resultado seguro para estado local.
 * @throws {Error} AbortError cuando la consulta fue cancelada por una operación posterior.
 */
async function resolveCurrentSession(authClient, signal) {
  try {
    const response = await authClient.getMe({
      signal
    });
    if (!response?.user) {
      throw new Error('La respuesta de sesión no contiene un usuario.');
    }
    return {
      user: response.user,
      error: null
    };
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    if (isSessionAbsence(error)) return {
      user: null,
      error: null
    };
    return {
      user: null,
      error
    };
  }
}

/**
 * Obtiene el estado visible correspondiente al resultado de consultar /me.
 * @param {{user: object|null, error: unknown|null}} result Resultado normalizado.
 * @returns {string} Estado autenticado, anónimo o error técnico.
 */
function statusForSessionResult(result) {
  if (result.user) return SESSION_STATUS.AUTHENTICATED;
  return result.error ? SESSION_STATUS.ERROR : SESSION_STATUS.ANONYMOUS;
}

/**
 * Mantiene en memoria el usuario público y coordina restauración, login y logout sin leer cookies.
 * @param {object} props Propiedades del proveedor.
 * @param {import('react').ReactNode} props.children Árbol de aplicación.
 * @param {object} [props.authClient] API AUTH inyectable para pruebas.
 * @returns {import('react').ReactElement} Proveedor centralizado de sesión.
 */
export function SessionProvider({
  children,
  authClient = authApi
}) {
  const [status, setStatus] = useState(SESSION_STATUS.CHECKING);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  // Reflejos sincronizados del estado para tomar instantáneas coherentes dentro de callbacks async.
  const userMirrorRef = useRef(null);
  const statusMirrorRef = useRef(SESSION_STATUS.CHECKING);
  const operationIdRef = useRef(0);
  const sessionControllerRef = useRef(null);
  // Bandera de mutación de sesión: login y logout no pueden superponerse.
  const sessionMutationActiveRef = useRef(false);

  /**
   * Aplica una instantánea completa y coherente de la sesión a los estados React y sus reflejos.
   * @param {{user: object|null, error: unknown|null, status: string}} snapshot Estado a publicar.
   * @returns {void}
   */
  function applySessionSnapshot(snapshot) {
    userMirrorRef.current = snapshot.user;
    statusMirrorRef.current = snapshot.status;
    setUser(snapshot.user);
    setError(snapshot.error);
    setStatus(snapshot.status);
  }
  useEffect(() => {
    const controller = new AbortController();
    const operationId = operationIdRef.current + 1;
    operationIdRef.current = operationId;
    sessionControllerRef.current = controller;
    let active = true;
    resolveCurrentSession(authClient, controller.signal).then(result => {
      if (!active || operationId !== operationIdRef.current) return;
      applySessionSnapshot({
        user: result.user,
        error: result.error,
        status: statusForSessionResult(result)
      });
    }).catch(caughtError => {
      if (caughtError?.name !== 'AbortError' && active && operationId === operationIdRef.current) {
        applySessionSnapshot({
          user: null,
          error: caughtError,
          status: SESSION_STATUS.ERROR
        });
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [authClient]);

  /**
   * Revalida la cookie HttpOnly mediante /me y actualiza el usuario en memoria.
   * @returns {Promise<object|null>} Usuario vigente o null si no hay sesión autorizada.
   * @throws {Error} AbortError cuando otra operación canceló esta revalidación.
   */
  async function refreshSession() {
    sessionControllerRef.current?.abort();
    const controller = new AbortController();
    const operationId = operationIdRef.current + 1;
    operationIdRef.current = operationId;
    sessionControllerRef.current = controller;
    applySessionSnapshot({
      user: userMirrorRef.current,
      error: null,
      status: SESSION_STATUS.CHECKING
    });
    const result = await resolveCurrentSession(authClient, controller.signal);
    if (operationId !== operationIdRef.current) return result.user;
    applySessionSnapshot({
      user: result.user,
      error: result.error,
      status: statusForSessionResult(result)
    });
    return result.user;
  }

  /**
   * Calcula el estado estable de recuperación tras un fallo de login o logout.
   * Un bootstrap incompleto aporta un estado 'checking' transitorio que no es recuperable,
   * por lo que se degrada a anónimo; cualquier otro estado estable se conserva.
   * @param {string} previousStatus Estado vigente al iniciar la operación fallida.
   * @returns {string} Estado estable para publicar junto con el error.
   */
  function restoreStatusAfterFailure(previousStatus) {
    return previousStatus === SESSION_STATUS.CHECKING ? SESSION_STATUS.ANONYMOUS : previousStatus;
  }

  /**
   * Inicia sesión mediante la API y conserva solo la proyección pública del usuario.
   * @param {{email: string, password: string}} credentials Credenciales no persistidas.
   * @returns {Promise<object>} Usuario autenticado devuelto por el backend.
   * @throws {Error} Error del backend, de red o si ya existía una mutación de sesión en curso.
   */
  async function login(credentials) {
    if (sessionMutationActiveRef.current) {
      throw new Error(SESSION_MUTATION_IN_PROGRESS_MESSAGE);
    }
    sessionMutationActiveRef.current = true;
    try {
      sessionControllerRef.current?.abort();
      sessionControllerRef.current = null;
      const operationId = operationIdRef.current + 1;
      operationIdRef.current = operationId;
      const previousSnapshot = {
        user: userMirrorRef.current,
        status: statusMirrorRef.current
      };
      try {
        const response = await authClient.login(credentials);
        if (!response?.user) throw new Error('La respuesta de login no contiene un usuario.');
        if (operationId !== operationIdRef.current) return response.user;
        applySessionSnapshot({
          user: response.user,
          error: null,
          status: SESSION_STATUS.AUTHENTICATED
        });
        return response.user;
      } catch (loginError) {
        if (operationId === operationIdRef.current) {
          // Un login fallido nunca debe dejar la sesión en "checking"; restaura el último estado
          // estable.
          applySessionSnapshot({
            user: previousSnapshot.user,
            error: loginError,
            status: restoreStatusAfterFailure(previousSnapshot.status)
          });
        }
        throw loginError;
      }
    } finally {
      // Se libera la bandera siempre: sin ella una operación cancelada bloquearía todas las
      // futuras.
      sessionMutationActiveRef.current = false;
    }
  }

  /**
   * Revoca la sesión presentada y limpia el usuario solo después de confirmar el 204 del backend.
   * @returns {Promise<void>} Finaliza cuando el cierre remoto fue confirmado o rechazado.
   * @throws {Error} Error del backend, de red o si ya existía una mutación de sesión en curso.
   */
  async function logout() {
    if (sessionMutationActiveRef.current) {
      throw new Error(SESSION_MUTATION_IN_PROGRESS_MESSAGE);
    }
    sessionMutationActiveRef.current = true;
    try {
      sessionControllerRef.current?.abort();
      sessionControllerRef.current = null;
      const operationId = operationIdRef.current + 1;
      operationIdRef.current = operationId;
      const previousSnapshot = {
        user: userMirrorRef.current,
        status: statusMirrorRef.current
      };
      try {
        await authClient.logout();
        if (operationId !== operationIdRef.current) return;
        applySessionSnapshot({
          user: null,
          error: null,
          status: SESSION_STATUS.ANONYMOUS
        });
      } catch (logoutError) {
        if (operationId === operationIdRef.current) {
          // Un logout conservó potencialmente la cookie: se muestra el error manteniendo el estado
          // previo.
          applySessionSnapshot({
            user: previousSnapshot.user,
            error: logoutError,
            status: restoreStatusAfterFailure(previousSnapshot.status)
          });
        }
        throw logoutError;
      }
    } finally {
      sessionMutationActiveRef.current = false;
    }
  }

  /**
   * Descarta localmente una sesión que el backend informó como inválida o revocada.
   * @returns {void}
   */
  function clearSession() {
    operationIdRef.current += 1;
    sessionControllerRef.current?.abort();
    sessionControllerRef.current = null;
    applySessionSnapshot({
      user: null,
      error: null,
      status: SESSION_STATUS.ANONYMOUS
    });
  }
  return <SessionContext.Provider
    value={{
      status,
      user,
      error,
      login,
      logout,
      refreshSession,
      clearSession
    }}
  >
    {children}
  </SessionContext.Provider>;
}
