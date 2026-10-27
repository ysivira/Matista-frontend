/**
 * Rutas, etiquetas e iconos de acceso a los módulos ADMIN y ASESOR.
 */
/** Trazos SVG existentes de MATISTA, compartidos por menús y accesos; no conceden permisos. */
const ICONOS = {
  'DIRECTORIO':
    'M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM1 18v-1a6 6 0 0 1 14 0v1M17 7a3 3 0 1 0-1-5.9M21 18v-1a6 6 0 0 0-3.5-5.4',
  'PLANES': 'M6 3h12l4 6-10 12L2 9zM2 9h20M9 3l3 6 3-6M12 21L9 9M12 21l3-12',
  'PRECIOS': 'M2 6h20v12H2zM2 11h20M6 15h4',
  'VERSIONES': 'M3 5h18M3 12h12M3 19h6M18 16v5M15 18h6',
  'CONFIGURACION': 'M4 7h16M4 17h16M8 4v6M16 14v6',
  'INICIO': 'M3 10l9-7 9 7v11h-6v-7H9v7H3z',
  'NUEVA': 'M12 4v16M4 12h16',
  'HISTORIAL': 'M7 3h10v18H7zM10 8h4M10 12h4M10 16h4',
  'CONDICIONES': 'M5 3h14v18H5zM8 7h8M8 12h8M8 17h5'
};

/** Rutas y textos de navegación del módulo ADMIN. */
export const NAVEGACION_ADMIN = [{
  ruta: '/admin',
  titulo: 'Inicio',
  tituloTarjeta: 'Inicio',
  icono: ICONOS.INICIO
}, {
  ruta: '/admin/empleados',
  titulo: 'Gestión de empleados',
  tituloTarjeta: 'Gestión de empleados',
  icono: ICONOS.DIRECTORIO,
  detalle: 'Administra las cuentas y el estado de los empleados.'
}, {
  ruta: '/admin/planes',
  titulo: 'Planes',
  tituloTarjeta: 'Planes',
  icono: ICONOS.PLANES,
  detalle: 'Consulta planes, prestaciones y coberturas.'
}, {
  ruta: '/admin/tarifario',
  titulo: 'Gestión de precios',
  tituloTarjeta: 'Gestión de precios',
  icono: ICONOS.PRECIOS,
  detalle: 'Consulta las listas y gestiona el tarifario.'
}, {
  ruta: '/admin/versiones',
  titulo: 'Versiones',
  tituloTarjeta: 'Versiones',
  icono: ICONOS.VERSIONES,
  detalle: 'Consulta y gestiona las versiones del tarifario.'
}, {
  ruta: '/admin/configuracion',
  titulo: 'Configuración',
  tituloTarjeta: 'Configuración',
  icono: ICONOS.CONFIGURACION,
  detalle: 'Administra la política comercial vigente.'
}];

/** Rutas y textos de navegación del módulo ASESOR. */
export const NAVEGACION_ASESOR = [{
  ruta: '/asesor',
  titulo: 'Inicio',
  tituloTarjeta: 'Inicio',
  icono: ICONOS.INICIO
}, {
  ruta: '/asesor/nueva',
  titulo: 'Nueva cotización',
  tituloTarjeta: 'Nueva cotización',
  icono: ICONOS.NUEVA,
  detalle: 'Prepara cliente, plan y condiciones comerciales.'
}, {
  ruta: '/asesor/cotizaciones',
  titulo: 'Historial',
  tituloTarjeta: 'Historial',
  icono: ICONOS.HISTORIAL,
  detalle: 'Consulta cotizaciones, detalle y trazabilidad.'
}, {
  ruta: '/asesor/planes',
  titulo: 'Planes',
  tituloTarjeta: 'Catálogo de planes',
  icono: ICONOS.PLANES,
  detalle: 'Consulta las coberturas publicadas.'
}, {
  ruta: '/asesor/precios',
  titulo: 'Consultar precios',
  tituloTarjeta: 'Listas de precios',
  icono: ICONOS.PRECIOS,
  detalle: 'Consulta, imprime y exporta tarifas vigentes.'
}, {
  ruta: '/asesor/condiciones',
  titulo: 'Condiciones comerciales',
  tituloTarjeta: 'Condiciones comerciales',
  icono: ICONOS.CONDICIONES,
  detalle: 'Consulta los aportes, descuentos y condiciones vigentes.'
}];
