# Peña Outra Máis

Web mobile-first y futura zona de administración de la Peña Outra Máis.

## Arquitectura

- **GitHub**: `DTV79/PenaOutraMais` · código fuente y control de versiones.
- **Vercel**: previews y despliegues web.
- **Supabase**: PostgreSQL, seguridad RLS y backend.

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
