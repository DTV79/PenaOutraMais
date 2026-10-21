# Arquitectura de Peña Outra Máis

## Objetivo

Mantener el proyecto fácil de modificar sin que un cambio en una zona afecte accidentalmente a otra.

## Capas

### 1. HTML
`index.html` contiene solo estructura y puntos de montaje. No debe contener lógica de negocio ni bloques grandes de CSS/JS.

### 2. CSS
- `base.css`: variables, reset y utilidades.
- `layout.css`: estructura general, cabecera, navegación y responsive.
- `components.css`: componentes reutilizables.
- `pages.css`: estilos específicos de secciones.
- `theme.css`: identidad visual y overrides finales.
- `styles.css`: únicamente importa los anteriores.

### 3. JavaScript
- `app/main.js`: arranque y coordinación.
- `config/`: configuración pública.
- `services/`: acceso a Supabase y composición de consultas.
- `modules/`: lógica y renderizado de cada área.
- `ui/`: navegación y comportamiento común.
- `utils/`: funciones puras reutilizables.
- `data/`: fallback temporal.

### 4. Supabase
La base de datos es la fuente de verdad. El frontend no debe duplicar cálculos que pertenecen al backend.

## Reglas

1. Un fichero, una responsabilidad principal.
2. Evitar ficheros grandes; al crecer un módulo, dividirlo.
3. No añadir SQL nuevo directamente al snapshot del esquema: crear migración.
4. No exponer PII en consultas públicas.
5. No incluir claves secretas en GitHub ni en el navegador.
6. Mantener fallback solo mientras una sección aún no esté migrada completamente a Supabase.
7. Antes de borrar un módulo antiguo, verificar que ninguna referencia lo utiliza.


## Gestión de temporadas

La administración de años se divide en módulos:
- `admin/js/modules/temporadas/index.js`: coordinación.
- `service.js`: lectura y RPC de temporadas.
- `list.js`: histórico 2012 en adelante.
- `form.js`: preparación de nuevas temporadas.

Las temporadas históricas pueden no disponer de cuota conocida. La activación de una temporada futura arrastra el bote final del año anterior y aplica los saldos adelantados destinados a ese año.
