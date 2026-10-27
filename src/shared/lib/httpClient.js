/**
 * Cliente HTTP del frontend: cookies de sesión, cancelaciones y errores tipificados.
 */
const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Representa un error HTTP de la API y conserva el código público del contrato cuando existe.
 */
export class ApiError extends Error {
  /**
   * @param {object} options Datos públicos y estado HTTP de la respuesta.
   * @param {number} options.status Estado HTTP recibido.
   * @param {string} options.message Mensaje seguro para la interfaz.
   * @param {string} [options.code] Código estable definido por el backend.
   * @param {Array<object>} [options.details] Errores públicos asociados a campos.
   * @param {unknown} [options.cause] Causa técnica no destinada a la interfaz.
   */
  constructor({
    status,
    message,
    code,
    details,
    cause
  }) {
    super(message, cause === undefined ? undefined : {
      cause
    });
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Representa un fallo de transporte antes de recibir una respuesta HTTP o durante la lectura de su
 * cuerpo.
 */
export class NetworkError extends Error {
  /**
   * @param {unknown} cause Error original de fetch, conservado solo para diagnóstico técnico.
   */
  constructor(cause) {
    super('No se pudo establecer comunicación con la API.', {
      cause
    });
    this.name = 'NetworkError';
  }
}

/**
 * Normaliza la URL base configurada para evitar barras duplicadas al agregar rutas.
 * @param {string} baseUrl URL pública del backend o cadena vacía para mismo origen.
 * @returns {string} URL base sin barra final.
 */
function normalizeBaseUrl(baseUrl) {
  return baseUrl.trim().replace(/\/+$/, '');
}

/**
 * Lee una respuesta JSON o sin contenido sin asumir cuerpos para estados 204.
 * @param {Response} response Respuesta entregada por fetch.
 * @returns {Promise<unknown>} Cuerpo JSON o null cuando no existe contenido.
 * @throws {ApiError} Cuando el cuerpo declarado por la API no contiene JSON válido.
 */
async function readResponseBody(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new ApiError({
      status: response.status,
      message: 'La API devolvió una respuesta JSON no válida.',
      cause
    });
  }
}

/**
 * Construye un cliente HTTP pequeño con fetch inyectable para pruebas aisladas.
 * @param {object} [options] Configuración del cliente.
 * @param {string} [options.baseUrl] URL pública del backend; vacío usa el mismo origen.
 * @param {typeof fetch} [options.fetchImpl] Implementación de fetch.
 * @returns {{request: Function}} Cliente con una operación request reutilizable.
 */
export function createHttpClient({
  baseUrl = DEFAULT_API_BASE_URL,
  fetchImpl = globalThis.fetch
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('El cliente HTTP requiere una implementación de fetch.');
  }
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  /**
   * Ejecuta una solicitud JSON incluyendo siempre la cookie HttpOnly administrada por el navegador.
   * @param {string} path Ruta absoluta dentro de la API.
   * @param {object} [options] Método, cuerpo, cabeceras y señal de cancelación.
   * @returns {Promise<unknown>} Cuerpo público de éxito o null para respuestas sin contenido.
   * @throws {ApiError|NetworkError} Error contractual HTTP o fallo de transporte.
   */
  async function request(path, {
    method = 'GET',
    body,
    headers,
    signal
  } = {}) {
    if (typeof path !== 'string' || !path.startsWith('/')) {
      throw new TypeError('La ruta de API debe comenzar con /.');
    }
    const requestHeaders = new Headers(headers);
    const requestOptions = {
      method,
      headers: requestHeaders,
      credentials: 'include',
      signal
    };
    if (body !== undefined) {
      requestHeaders.set('Content-Type', 'application/json');
      requestOptions.body = JSON.stringify(body);
    }
    let response;
    let payload;
    try {
      response = await fetchImpl(`${normalizedBaseUrl}${path}`, requestOptions);
      // La lectura del cuerpo también puede fallar por transporte; se normaliza igual que la
      // solicitud.
      payload = await readResponseBody(response);
    } catch (cause) {
      // Se respeta la cancelación del llamador y los errores ya contractuales sin reinterpretarlos
      // como red.
      if (cause?.name === 'AbortError' || cause instanceof ApiError) throw cause;
      throw new NetworkError(cause);
    }
    if (!response.ok) {
      const contractError = payload?.error;
      throw new ApiError({
        status: response.status,
        code: typeof contractError?.code === 'string' ? contractError.code : undefined,
        message: typeof contractError?.message === 'string' ? contractError.message :
          'La API respondió con un error.',
        details: Array.isArray(contractError?.details) ? contractError.details : undefined
      });
    }
    return payload;
  }
  return {
    request
  };
}
export const httpClient = createHttpClient();
