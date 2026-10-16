# MATISTA Frontend

Aplicación web de MATISTA construida con React, Vite y JavaScript ES Modules.

## Estado actual

SPEC-02, etapa D.2 implementada:

- Router modular con rutas públicas y guards por sesión, estado y rol.
- Cliente HTTP basado en `fetch` y configurado con `credentials: 'include'`.
- Capa API para los doce endpoints del contrato AUTH vigente.
- Sesión centralizada en memoria y restaurada mediante `GET /api/auth/me`.
- Tokens globales de Amethyst Prism y recursos oficiales locales.
- Placeholders mínimos para validar rutas sin anticipar pantallas funcionales.
- Pruebas aisladas con Vitest, React Testing Library y jsdom.

No se implementaron todavía los formularios ni las pantallas finales de login,
registro, verificación o recuperación. Tampoco existen interfaces funcionales de
ADMIN o ASESOR.

## Requisitos

- Node.js 24 o una versión compatible posterior.
- npm y las dependencias declaradas en `package.json`.

## Comandos

Instalar exactamente las dependencias del lockfile:

```bash
npm ci
```

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

Ejecutar verificaciones:

```bash
npm run lint
npm run test
npm run build
```

Ejecutar las pruebas en modo observación:

```bash
npm run test:watch
```

## Variables de entorno

Copiar la configuración pública documentada en `.env.example` al entorno local
correspondiente. Vite incorpora las variables `VITE_*` al navegador, por lo que
nunca deben contener contraseñas, tokens ni secretos.

```text
VITE_API_BASE_URL=http://localhost:3000
```

Si `VITE_API_BASE_URL` no está definida, el cliente utiliza el mismo origen del
frontend. La URL no debe terminar en `/`; el cliente también normaliza esa barra
si estuviera presente.

## Arquitectura D.2

```text
src/
|-- app/
|   |-- AppProviders.jsx
|   |-- PlaceholderPages.jsx
|   `-- router.jsx
|-- assets/brand/
|   |-- logo.png
|   `-- logo1.png
|-- features/auth/
|   |-- api/authApi.js
|   |-- components/ProtectedRoute.jsx
|   |-- context/
|   |   |-- SessionContext.js
|   |   `-- SessionProvider.jsx
|   |-- hooks/useSession.js
|   `-- auth.constants.js
|-- shared/
|   |-- lib/httpClient.js
|   `-- ui/
|       |-- BrandLogo.jsx
|       `-- LoadingState.jsx
|-- App.css
|-- App.jsx
|-- index.css
`-- main.jsx
tests/
|-- authApi.test.js
|-- httpClient.test.js
|-- router.test.jsx
|-- session.test.jsx
`-- setup.js
```

## Seguridad de sesión

- El navegador administra la cookie HttpOnly `matista_session`.
- El frontend no intenta leer la cookie.
- No se almacena ninguna credencial o token en `localStorage` o `sessionStorage`.
- No existe refresh token ni renovación automática.
- Los guards mejoran la navegación, pero el backend conserva la autorización
  efectiva en cada solicitud protegida.
- Una cuenta pendiente no se representa como sesión autenticada.

## Identidad visual

Los tokens globales siguen Amethyst Prism y utilizan `#1B1D2B` como fondo común.
`logo.png` se reserva para fondos oscuros y `logo1.png` para fondos claros. Los
archivos se mantienen sin alterar y no dependen de URLs externas.

La tipografía definitiva sigue pendiente para una etapa visual posterior. D.2
utiliza una pila local del sistema para evitar dependencias CDN.

## Integración pendiente

Las pruebas actuales utilizan dobles y no acreditan integración real con el
backend, MySQL, SMTP, CORS de despliegue ni cookies bajo HTTPS. Esas verificaciones
corresponden al bloque de validación autorizado posteriormente.
