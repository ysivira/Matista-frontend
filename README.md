# MATISTA Frontend

Aplicacion web base de MATISTA construida con React, Vite y JavaScript ES
Modules.

## Estado actual

Implementado:

- Bootstrap de Vite mediante `index.html` y `src/main.jsx`.
- Montaje de React en modo estricto.
- Pantalla inicial contenida en `src/App.jsx`.
- Estilos globales y de la pantalla inicial.
- Configuracion base de Vite y ESLint.
- Assets publicos y assets importados por React.

Reservado, pero no implementado:

- Composicion de aplicacion en `src/app`.
- Features `auth`, `admin` y `asesor`.
- UI, layouts y utilidades compartidas.
- Pruebas automatizadas.

Los directorios reservados contienen unicamente archivos `.gitkeep`. No existen
todavia `router.jsx`, `providers.jsx`, paginas, componentes de negocio, hooks,
clientes API ni rutas funcionales. La pantalla actual sigue siendo el bootstrap
visual inicial de Vite y no representa una interfaz funcional de MATISTA.

## Requisitos

- Node.js 24 o una version compatible posterior para las versiones actuales de
  Vite y ESLint.
- npm y las dependencias declaradas en `package.json`.

El proyecto no declara actualmente una version de Node mediante `engines`.

## Comandos

Instalar exactamente las dependencias del lockfile:

```bash
npm ci
```

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

Generar el build de produccion en `dist`:

```bash
npm run build
```

Ejecutar ESLint:

```bash
npm run lint
```

Previsualizar un build existente:

```bash
npm run preview
```

No existe todavia un script ni un runner de pruebas.

## Variables de entorno

El frontend no consume variables de entorno en su estado actual. Por ese motivo
no existe `.env.example` y no se ha definido una URL base de API ficticia.

## Arquitectura

```text
src/
|-- app/                         # Reservado
|-- features/                    # Reservado
|   |-- auth/
|   |   |-- pages/
|   |   |-- components/
|   |   |-- hooks/
|   |   `-- api/
|   |-- admin/
|   |   |-- pages/
|   |   |-- components/
|   |   |-- hooks/
|   |   `-- api/
|   `-- asesor/
|       |-- pages/
|       |-- components/
|       |-- hooks/
|       `-- api/
|-- shared/                      # Reservado
|   |-- ui/
|   |-- layouts/
|   `-- lib/
|-- assets/                      # Implementado
|-- App.css                      # Implementado
|-- App.jsx                      # Implementado
|-- index.css                    # Implementado
`-- main.jsx                     # Implementado
tests/                           # Reservado
```

Las reglas comerciales deben permanecer en el dominio backend. El frontend
presentara datos y validaciones de experiencia de usuario sin duplicar el motor
de calculo autoritativo.
