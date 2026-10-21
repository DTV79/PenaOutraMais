-- 0005_movimientos_cuotas_auditoria.sql
-- Añade destino de saldos futuros y anulación lógica para conservar histórico.

alter table public.movimientos_cuotas
  add column if not exists aplicar_anio integer,
  add column if not exists anulado_at timestamptz,
  add column if not exists anulado_por uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'movimientos_cuotas_aplicar_anio_valido'
      and conrelid = 'public.movimientos_cuotas'::regclass
  ) then
    alter table public.movimientos_cuotas
      add constraint movimientos_cuotas_aplicar_anio_valido
      check (aplicar_anio is null or aplicar_anio between 2012 and 2100);
  end if;
end $$;
