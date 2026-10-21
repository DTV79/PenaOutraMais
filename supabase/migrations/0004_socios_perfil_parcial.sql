-- 0004_socios_perfil_parcial.sql
-- El Excel histórico solo contiene alias para los socios actuales.
-- Se permiten perfiles parciales para no inventar PII ni fechas.

alter table public.socios
  alter column nombre drop not null,
  alter column apellidos drop not null,
  alter column dni drop not null,
  alter column fecha_alta drop not null;
