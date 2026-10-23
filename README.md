# Peña Outra Máis

Web mobile-first y futura zona de administración de la Peña Outra Máis.

## Arquitectura

- **GitHub**: `DTV79/PenaOutraMais` · código fuente y control de versiones.
- **Vercel**: previews y despliegues web.
- **Supabase**: PostgreSQL, seguridad RLS y backend.

## Principio de organización

El proyecto se divide por responsabilidades. Ningún fichero funcional debe crecer hasta convertirse en un bloque monolítico.

- `config/` contiene configuración pública.
- `services/` contiene acceso a datos.
- `modules/` contiene cada área funcional.
- `ui/` contiene comportamiento común de interfaz.
- `utils/` contiene utilidades reutilizables.
- `data/` contiene únicamente datos de respaldo temporal.
- `app/main.js` coordina el arranque, pero no contiene lógica específica de cada módulo.

## Estructura

```text
PenaOutraMais/
├── index.html
├── css/
│   ├── styles.css
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   ├── pages.css
│   └── theme.css
├── js/
│   ├── app/
│   │   └── main.js
│   ├── config/
│   │   └── supabase-config.js
│   ├── data/
│   │   └── fallback.js
│   ├── modules/
│   │   ├── cuotas.js
│   │   ├── historico.js
│   │   ├── normas.js
│   │   ├── numeros.js
│   │   ├── premios.js
│   │   └── temporada.js
│   ├── services/
│   │   ├── public-data.js
│   │   └── supabase.js
│   ├── ui/
│   │   └── navigation.js
│   ├── utils/
│   │   └── format.js
│   └── pwa.js
├── docs/
│   └── ARCHITECTURE.md
├── supabase/
│   ├── schema.sql
│   └── migrations/
│       └── 0001_baseline.md
├── manifest.webmanifest
├── icon.svg
├── sw.js
└── README.md
```

## Supabase

Proyecto: `djrmbdbtfsgzwwcsatll`

Tablas actuales:
- `socios` · privada
- `temporadas` · lectura pública
- `combinaciones` · lectura pública
- `movimientos_cuotas` · privada
- `movimientos_bote` · lectura pública
- `resumen_anual` · lectura pública

Los datos personales de socios no se exponen a `anon` ni a la parte pública.

## Estado inicial

- Temporada 2026: 1 €/semana · 52 semanas · 52 €/año.
- 10 combinaciones fijas cargadas en Supabase.
- Histórico económico 2012–2026 cargado.
- Portada pública conectada a Supabase para temporada, combinaciones, bote e histórico.

## Seguridad

La web utiliza únicamente la **publishable key** de Supabase. Nunca debe incluirse una `service_role` o una secret key en el frontend.

## Regla para futuros cambios

Cuando se añada una nueva función, debe ir en su módulo correspondiente o en un módulo nuevo. No se añadirá lógica extensa directamente a `index.html` ni a `main.js`.

## Copias de seguridad

Respaldo cifrado de PostgreSQL y Supabase Storage programado los días 1 y 16 de cada mes a las 07:30 (Europe/Madrid). Requiere configurar previamente los tres secretos de GitHub Actions; no se almacena ningún dato privado en este repositorio.

Véase [configuración, comprobación y restauración](docs/COPIAS_AUTOMATICAS.md).
