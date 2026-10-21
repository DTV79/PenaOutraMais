-- 0007_bote_auditoria_y_resumen.sql
-- Auditoría de movimientos del bote y sincronización automática de resumen_anual.

alter table public.movimientos_bote
  add column if not exists anulado_at timestamptz,
  add column if not exists anulado_por uuid references auth.users(id) on delete set null;

-- Los tipos de entrada deben ser positivos y las salidas negativas.
-- Ajuste admite ambos signos.
alter table public.movimientos_bote
  add constraint movimientos_bote_signo_tipo
  check (
    (tipo in ('arrastre','premio','premio_extra') and importe > 0)
    or (tipo in ('gasto','reparto') and importe < 0)
    or (tipo='ajuste' and importe <> 0)
  );

create unique index movimientos_bote_arrastre_activo_unico
  on public.movimientos_bote(anio)
  where tipo='arrastre' and anulado_at is null;

-- La función private.recalcular_resumen_bote(smallint) recalcula resumen_anual
-- a partir de movimientos no anulados y el trigger movimientos_bote_sync_resumen
-- la ejecuta tras INSERT/UPDATE/DELETE.

-- La lectura pública excluye anulados; los administradores pueden leerlos
-- para mantener la trazabilidad.
