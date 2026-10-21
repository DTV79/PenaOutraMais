# Supabase

Proyecto: `djrmbdbtfsgzwwcsatll`

## Organización

- `schema.sql`: fotografía legible del esquema actual.
- `migrations/`: cambios futuros de estructura, RLS, funciones, triggers y políticas.

## Regla de trabajo

A partir de esta estructura, cada cambio de base de datos debe quedar en una migración independiente y numerada.

Ejemplos:

```text
migrations/
├── 0001_baseline.md
├── 0002_sorteos.sql
├── 0003_jugadas_especiales.sql
└── 0004_administradores.sql
```

No se deben acumular cambios futuros en un único SQL interminable.

## Seguridad

- `socios` y `movimientos_cuotas` son privados.
- Las tablas públicas se exponen únicamente mediante RLS.
- Nunca se utiliza `service_role` en el frontend.
