-- 0007_bote_auditoria_y_resumen.sql
-- Auditoría de movimientos del bote y sincronización automática de resumen_anual.

alter table public.movimientos_bote
  add column if not exists anulado_at timestamptz,
  add column if not exists anulado_por uuid references auth.users(id) on delete set null;

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

create or replace function private.recalcular_resumen_bote(p_anio smallint)
returns void
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_arrastre numeric(12,2);
  v_premios numeric(12,2);
  v_gastos numeric(12,2);
  v_extra numeric(12,2);
  v_saldo numeric(12,2);
begin
  select
    coalesce(sum(case when tipo='arrastre' then importe else 0 end),0),
    coalesce(sum(case when tipo='premio' then importe else 0 end),0),
    coalesce(sum(case when tipo in ('gasto','reparto') then abs(importe) else 0 end),0),
    coalesce(sum(case when tipo='premio_extra' then importe else 0 end),0),
    coalesce(sum(importe),0)
  into v_arrastre,v_premios,v_gastos,v_extra,v_saldo
  from public.movimientos_bote
  where anio=p_anio and anulado_at is null;

  insert into public.resumen_anual (
    anio,arrastre_inicial,premios_ordinarios,gastos_salidas,
    premios_extra,saldo_final,observaciones,provisional
  )
  values (
    p_anio,v_arrastre,v_premios,v_gastos,v_extra,v_saldo,
    'Resumen calculado desde movimientos del bote',true
  )
  on conflict (anio) do update
    set arrastre_inicial=excluded.arrastre_inicial,
        premios_ordinarios=excluded.premios_ordinarios,
        gastos_salidas=excluded.gastos_salidas,
        premios_extra=excluded.premios_extra,
        saldo_final=excluded.saldo_final,
        updated_at=now();
end;
$$;

revoke all on function private.recalcular_resumen_bote(smallint) from public, anon;
grant execute on function private.recalcular_resumen_bote(smallint) to authenticated;

create or replace function private.sync_resumen_bote_trigger()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if tg_op='DELETE' then
    perform private.recalcular_resumen_bote(old.anio);
    return old;
  end if;

  perform private.recalcular_resumen_bote(new.anio);

  if tg_op='UPDATE' and old.anio is distinct from new.anio then
    perform private.recalcular_resumen_bote(old.anio);
  end if;

  return new;
end;
$$;

revoke all on function private.sync_resumen_bote_trigger() from public, anon, authenticated;

drop trigger if exists movimientos_bote_sync_resumen on public.movimientos_bote;
create trigger movimientos_bote_sync_resumen
after insert or update or delete on public.movimientos_bote
for each row execute function private.sync_resumen_bote_trigger();

drop policy if exists "movimientos_bote_public_read" on public.movimientos_bote;
create policy "movimientos_bote_public_read"
on public.movimientos_bote
for select
to anon, authenticated
using (anulado_at is null);

drop policy if exists "movimientos_bote_admin_read" on public.movimientos_bote;
create policy "movimientos_bote_admin_read"
on public.movimientos_bote
for select
to authenticated
using (
  exists (
    select 1
    from public.administradores a
    where a.user_id=(select auth.uid())
      and a.activo=true
  )
);
