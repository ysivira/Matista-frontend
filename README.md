# MATISTA · Frontend

Aplicación web de MATISTA, proyecto académico de **Taller de Desarrollo de Aplicaciones Informáticas**, surgido de la refactorización y evolución de SIGEC. Este repositorio contiene la interfaz React; la API Node/Express se mantiene en un repositorio independiente.

La interfaz implementa los recorridos de AUTH, ADMIN y ASESOR. Consume los cálculos y datos autorizados del backend; no reemplaza sus reglas comerciales ni controles de acceso.

## Contenido

- [Funcionalidades](#funcionalidades)
- [Tecnologías y requisitos](#tecnologías-y-requisitos)
- [Arquitectura](#arquitectura)
- [Instalación y configuración](#instalación-y-configuración)
- [Ejecución, build y pruebas](#ejecución-build-y-pruebas)
- [Integración con el backend](#integración-con-el-backend)
- [Despliegue en Vercel](#despliegue-en-vercel)
- [Seguridad y límites](#seguridad-y-límites)

## Funcionalidades

### AUTH y perfil

- Formularios de registro, login, confirmación/reenvío de correo, recuperación y restablecimiento de contraseña.
- Cambio y confirmación de correo, edición de perfil y cambio de contraseña.
- Restauración de sesión, cierre de sesión y navegación por rol, con estados de carga, error técnico y reintento.

El registro no da acceso inmediato: la cuenta queda pendiente; confirmar correo y obtener aprobación ADMIN son pasos distintos.

### ADMIN

- Inicio del módulo y directorio de empleados con detalle, acciones de estado y rol y bloqueo de activación si el correo actual no está verificado.
- Consulta de planes y tarifario.
- Gestión de versiones de precios: borradores, edición, vista previa de aumentos, aplicación, finalización, reanudación, activación manual y acciones históricas según estado.
- Configuración comercial con política vigente, historial y programación/cancelación de pendientes.
- Acciones compartidas de consulta, impresión y descarga de documentos.

Los planes proceden de un catálogo inicializado en backend. **No se implementa un CRUD general de planes** ni una administración de listas ajena al ciclo de versiones tarifarias.

### ASESOR

- Inicio comercial, consulta de planes/listas/condiciones y búsqueda, alta o edición de cliente dentro del recorrido de cotización.
- Cotización **Obligatorio, Voluntario y Monotributo**, grupo familiar, modalidad de aportes y selección de descuentos/beneficios.
- Vista previa económica del backend, revisión de datos y confirmación de emisión.
- Historial y detalle propios; continuación de borrador, edición de contacto, recotización vinculada, anulación y PDF de una emisión autorizada.

**Flujo principal:** seleccionar o registrar cliente → completar familia/plan/modalidad/condiciones → consultar vista previa → guardar preparación → solicitar cálculo → confirmar emisión con revisión y huella → consultar detalle y descargar PDF.

El importe definitivo y sus topes proceden del servidor. Las acciones disponibles dependen del estado de la cotización y de la autorización vigente. No se sustituye una emisión histórica al recotizarla.

**No existe un módulo Supervisor funcional.** Algunas pantallas auxiliares de cuenta/ruta no encontrada son informativas; no representan módulos de negocio adicionales.

## Tecnologías y requisitos

JavaScript/JSX y CSS propios con ES Modules. Las versiones exactas siguientes provienen de `package-lock.json`; `package.json` contiene los rangos admitidos.

| Tecnología | Versión bloqueada | Uso |
|---|---|---|
| React / React DOM | 19.3.1 / 19.3.1 | Componentes y renderizado |
| React Router DOM | 7.18.4 | Rutas públicas/protegidas y router de pruebas |
| Vite / plugin React | 8.3.4 / 6.1.2 | Desarrollo y compilación |
| Vitest | 5.0.5 | Ejecución de pruebas |
| React Testing Library | 16.3.3 | Pruebas de componentes |
| jsdom | 30.1.3 | Entorno DOM simulado |
| ESLint | 10.12.0 | Análisis estático |

Se utilizan hooks y Context de React para estado/sesión; formularios con componentes y validaciones propias; `fetch` nativo para HTTP. No se atribuyen Redux, Axios ni bibliotecas de formularios que no están en las dependencias.

El proyecto declara `engines.node: "24.x"`. Usar **Node.js 24.x desde 24.15.0** para toda la cadena bloqueada: jsdom exige `^22.22.2 || ^24.15.0 || >=26.0.0`, y Vite, Vitest y ESLint también tienen restricciones. No asumir que cualquier Node 20 o cualquier Node 24 inicial ejecutará todas las herramientas. No se fija una versión concreta de npm.

## Arquitectura

```text
index.html                     # entrada HTML
src/
├── main.jsx                   # montaje React, StrictMode y proveedores
├── App.jsx                    # router de aplicación
├── app/                       # router, proveedores y SessionLayout
├── features/
│   ├── auth/                  # páginas, API, validación y contexto de sesión
│   ├── admin/                 # páginas, API, hooks y componentes ADMIN
│   ├── asesor/                # formulario, historial, detalle y catálogo de consulta
│   └── perfil/                # perfil y acciones de cuenta compartidas
├── shared/
│   ├── lib/                   # cliente HTTP, errores y utilidades de presentación
│   ├── api/                   # cliente del catálogo compartido
│   ├── catalogo/              # consultas reutilizadas por ambos roles
│   ├── layouts/               # composición de interfaz
│   └── ui/                    # modales, carga, navegación, marca y documentos
└── assets/                    # recursos locales
public/                        # favicons e iconografía
tests/                         # Vitest + Testing Library
```

- `AppProviders` incorpora `SessionProvider`. La sesión pública se mantiene en memoria y se restaura mediante `GET /api/auth/me`.
- `ProtectedRoute` limita navegación por sesión/rol. El backend sigue autorizando cada solicitud.
- Las capas `api` por funcionalidad usan el cliente compartido; el catálogo neutral evita acoplar ASESOR a pantallas de administración.
- `httpClient.js` configura `credentials: 'include'`, JSON y señales de cancelación; distingue `ApiError` de `NetworkError`.
- Los formularios gestionan validación, errores de campo y envíos con hooks; `MatistaLoadingModal`, alertas y componentes compartidos representan carga y fallos.
- Los estilos son CSS locales y los recursos de marca se sirven desde el repositorio.

### Rutas visibles principales

| Área | Rutas reales |
|---|---|
| Públicas | `/login`, `/register`, `/confirm-email`, `/confirm-email-change`, `/resend-verification`, `/forgot-password`, `/reset-password` |
| ADMIN | `/admin`, `/admin/empleados`, `/admin/planes`, `/admin/tarifario`, `/admin/versiones`, `/admin/configuracion` |
| ASESOR | `/asesor`, `/asesor/planes`, `/asesor/precios`, `/asesor/condiciones`, `/asesor/nueva`, `/asesor/cotizaciones` |
| Cotización | `/asesor/cotizaciones/:id`, `/:id/preparacion` y `/:id/recotizar` bajo `/asesor/cotizaciones` |
| Compartida | `/perfil` para ADMIN y ASESOR |

La raíz redirige a `/login`. No se documenta `/asesor/clientes` como página montada: la existencia de un archivo de componente no significa que tenga una ruta pública en el router actual.

## Instalación y configuración

Dentro de este repositorio:

```bash
npm ci
```

Instala las versiones resueltas por `package-lock.json`. Preparar la API, MySQL y SMTP siguiendo el README del backend; el frontend no crea bases, catálogos ni administradores.

### URL de la API

La única variable de aplicación observada es `VITE_API_BASE_URL`. Es **pública**: Vite incorpora su valor al código del navegador. No debe contener claves, contraseñas, tokens ni credenciales de URL.

El cliente agrega rutas que ya comienzan por `/api`. La base es sólo el origen o cadena vacía, **sin añadir `/api` otra vez**; normaliza barras finales.

**Mismo origen, recomendado y definido en [`.env.example`](.env.example):**

```dotenv
VITE_API_BASE_URL=
```

También se usa mismo origen si la variable no está definida en ninguna fuente del entorno. `vite.config.js` reenvía `/api` a `http://127.0.0.1:3000`, sin cambiar el Origin. El puerto de desarrollo es **5173**, con `strictPort`: no pasa silenciosamente a 5174.

**Conexión directa local, alternativa opcional y no válida para publicar:**

```dotenv
VITE_API_BASE_URL=http://localhost:3000
```

En ese caso el navegador contacta directamente con ese origen y debe coincidir con la política CORS/cookies del backend. No mezclar `localhost` y `127.0.0.1` sin revisar el comportamiento de cookie y mismo sitio.

Crear una copia local de la plantilla sólo si no existe `.env`; **no sobrescribir configuraciones existentes**. Si el `.env` existente usa una API local, se puede seleccionar el proxy sin editarlo mediante `VITE_API_BASE_URL= npm run dev` (shell POSIX). Revisar además variables del proceso y otros archivos Vite, ya que pueden definir la URL aunque no haya `.env`.

Las variables Vite se resuelven al iniciar desarrollo o compilar. Un build distribuido no lee después el `.env` privado del servidor backend. No se necesitan ni se admiten secretos MySQL/SMTP/JWT en este repositorio.

## Ejecución, build y pruebas

Todos los comandos siguientes existen en `package.json`:

| Comando | Efecto |
|---|---|
| `npm run dev` | Inicia Vite de desarrollo en 5173 |
| `npm run build` | Genera la compilación en `dist/` |
| `npm run preview` | Sirve localmente una compilación existente con Vite preview |
| `npm run lint` | Ejecuta ESLint; el script no incluye `--fix` |
| `npm test` | Ejecuta `vitest run` |
| `npm run test:watch` | Inicia Vitest en observación |

Las pruebas usan jsdom, `tests/setup.js`, mocks y Testing Library. Cubren sesión, router, AUTH/perfil, directorio, consultas y versiones, políticas, asesor y UI compartida/responsive. Hay un router de memoria con el mismo árbol de rutas para probar navegación.

No son una validación E2E de MySQL, SMTP, Chrome o cookies en un despliegue real. Las pruebas de transporte comprueban rutas relativas y envío de credenciales; las de despliegue verifican el orden del proxy y el fallback de `vercel.json`, no la ejecución del proxy en Vercel.

Para compilar en modo producción con API relativa, sin heredar un `localhost` del `.env` existente ni modificar ese archivo (shell POSIX):

```bash
VITE_API_BASE_URL= npm run build
```

El valor del proceso tiene prioridad sobre los archivos `.env`. El build local sin esa asignación puede seguir incorporando la API local configurada; no publicar ese artefacto.

`dist/` es un artefacto ignorado, no la fuente de verdad. Vite preview no es un despliegue permanente y puede usar un origen distinto de 5173; revisar `FRONTEND_ORIGIN` antes de probar autenticación desde él.

## Integración con el backend

Orden general de puesta en marcha en un entorno autorizado:

1. Preparar esquema, catálogos, cuenta administradora y configuración privada del backend.
2. Revisar su destino MySQL antes de arrancar: **el servidor puede activar políticas pendientes y escribir en base al iniciarse**.
3. Iniciar la API y verificar su endpoint HTTP `/api/health`; ese endpoint no certifica SMTP/base/PDF.
4. Alinear `FRONTEND_ORIGIN` con el origen exacto de la interfaz y elegir URL directa o proxy.
5. Iniciar la interfaz, autenticar una cuenta elegible y comprobar el recorrido del rol correspondiente.

Los enlaces de correo apuntan al origen configurado en backend y entregan el token temporal mediante fragmento URL. Las rutas de confirmación consumen ese token con la API; no son rutas GET del backend.

Para publicar en Vercel se utiliza la topología de mismo origen descrita a continuación. El build estático no incluye por sí mismo el proxy del servidor Vite. SameSite=Strict puede impedir cookies en topologías de sitios distintos; no basta con cambiar una URL o habilitar CORS indiscriminado.

El usuario informó funcionamiento local y mediante túnel de VS Code desde `main`; esta revisión documental no lo volvió a probar. **El túnel no constituye un despliegue permanente de producción** y no se publican sus URLs temporales. Con acceso remoto, `localhost` en una URL de API se refiere al equipo del visitante, no al equipo que aloja MATISTA.

## Despliegue en Vercel

**Dominio público deseado: `https://matista.vercel.app`. Su disponibilidad y asignación al proyecto todavía deben confirmarse en Vercel; esta configuración no reserva el dominio ni constituye un despliegue.** Backend existente: `https://matista-backend.vercel.app`.

### Arquitectura

```text
Navegador → https://matista.vercel.app (dominio deseado)
             ├─ recursos estáticos → dist/
             ├─ /api/* → https://matista-backend.vercel.app/api/*
             └─ rutas React → /index.html
```

[`vercel.json`](vercel.json) declara primero el rewrite externo de `/api/:path*`, conservando el prefijo `/api`, y después el fallback SPA. El proxy es interno: no redirige al navegador al dominio del backend. Permite abrir y recargar rutas como `/admin/empleados`, `/asesor/cotizaciones/123`, `/confirm-email` y `/reset-password`.

Con `VITE_API_BASE_URL` vacía o ausente, las llamadas HTTP y los enlaces de PDF/impresión usan `/api/...` bajo el origen público del frontend. El navegador administra la cookie HttpOnly y el cliente conserva `credentials: 'include'`. La cookie del backend sin `Domain` explícito y con `Path=/api` es compatible con esta topología; validar en el despliegue real que se conserva `Set-Cookie` y que la sesión se restaura. No relajar `SameSite=Strict` ni mover tokens al almacenamiento del navegador.

No se requiere ejecutar Vite, mantener una computadora encendida ni usar túneles. MySQL, SMTP y la generación de PDF siguen siendo responsabilidades del backend.

### Configuración del proyecto frontend

| Opción de Vercel | Valor |
|---|---|
| Framework Preset | Vite |
| Root Directory | Raíz de este repositorio |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js | 24.x; verificar que el build use al menos 24.15.0 |
| `VITE_API_BASE_URL` | Ausente o vacía; nunca `localhost`, `/api` ni la URL directa del backend para esta topología |
| Acceso de producción | Público, sin protección de despliegue que bloquee visitantes |

Vercel debe construir desde los fuentes versionados, no desde un `dist/` local potencialmente compilado con otra API. `.env`, `node_modules/` y `dist/` permanecen ignorados; no subirlos ni introducir secretos en variables `VITE_*`. Un cambio de entorno requiere recompilar.

### Dominio, backend y validaciones pendientes

1. Confirmar en Vercel si `matista.vercel.app` está disponible y puede asignarse al proyecto. Si no, acordar otro dominio antes de cambiar el backend.
2. **Sólo después de confirmar el dominio definitivo y con autorización**, alinear `FRONTEND_ORIGIN` del backend con ese origen HTTPS exacto, sin barra final. Si se confirma el deseado, será `https://matista.vercel.app`. No se modifica el backend durante esta preparación.
3. El proxy no evita el control de `Origin`: el backend lo valida en operaciones mutables, además de aplicar CORS. El mismo origen configurado determina los enlaces de correo. La auditoría previa observó que el backend público aceptaba `https://matista-frontend.vercel.app`; revisar esa configuración remota al confirmar el nuevo dominio, sin asumir que cambió.
4. Las URLs variables de Preview no están automáticamente autorizadas por el backend, que admite un único origen exacto. Coordinar un entorno de prueba separado o un origen estable autorizado; no habilitar comodines ni desactivar la protección de origen.
5. Tras autorizar la publicación, comprobar `/api/health`, login, cookie segura, `/api/auth/me`, recarga de sesión, logout, roles, PDF/impresión y enlaces de correo desde el dominio definitivo. Verificar que no haya solicitudes a `localhost` y que las respuestas autenticadas mantengan `Cache-Control: no-store`, sin caché compartida.

Referencias: [Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite) y [rewrites](https://vercel.com/docs/rewrites).

## Seguridad y límites

- La cookie `matista_session` es HttpOnly y la administra el navegador; el frontend no la lee ni conserva JWT/credenciales en `localStorage` o `sessionStorage`.
- La sesión pública reside en memoria; no hay refresh token ni renovación automática. Los guards no son una frontera de seguridad del servidor.
- Los tokens de enlaces son temporales y se manejan para la confirmación/restablecimiento; no compartir URLs de cuenta ni capturarlas en documentación pública.
- Toda variable `VITE_*` y todo archivo de `public/` puede ser visible para el visitante. Nunca almacenar allí secretos.
- No publicar `.env`, backups, datos personales, PDFs de clientes, capturas de cuentas o artefactos con configuración privada.
- `.gitignore` excluye entornos, dependencias, compilación, cobertura y varios archivos locales; no sanea commits antiguos ni impide un añadido forzado.
- Los datos económicos, la propiedad de clientes/cotizaciones y la autorización real se resuelven en la API. Validar un formulario en React no garantiza que una solicitud sea autorizada.

Antes de hacer público el repositorio, revisar el historial, identidad de commits, procedencia de fixtures y permisos sobre textos y marca. La descripción de controles no garantiza seguridad absoluta ni equivale a una auditoría de vulnerabilidades de dependencias o de producción.
