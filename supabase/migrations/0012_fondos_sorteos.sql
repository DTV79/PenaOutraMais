-- 0012_fondos_sorteos.sql
-- Separa la financiación de apuestas entre cuotas y bote.
-- La jugada habitual de La Primitiva usa cuotas.
-- Las jugadas especiales pueden elegir cuotas o bote.

alter table public.apuestas
  add column if not exists fuente_fondos text not null default 'cuotas';

update public.apuestas
set fuente_fondos='cuotas'
where fuente_fondos is null;

alter table public.apuestas
  add constraint apuestas_fuente_fondos_valida
  check (fuente_fondos in ('cuotas','bote'));

alter table public.sorteos
  add column if not exists movimiento_gasto_bote_id bigint
    references public.movimientos_bote(id) on delete set null;

create or replace function private.sync_gasto_bote_sorteo(p_sorteo_id bigint)
returns void
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_temporada_id bigint;
  v_fecha date;
  v_movimiento_id bigint;
  v_total_bote numeric(12,2);
  v_gasto_actual numeric(12,2) := 0;
  v_saldo_actual numeric(12,2) := 0;
  v_disponible numeric(12,2) := 0;
  v_juego_nombre text;
begin
  select s.temporada_id,s.fecha,s.movimiento_gasto_bote_id,j.nombre
  into v_temporada_id,v_fecha,v_movimiento_id,v_juego_nombre
  from public.sorteos s
  join public.juegos j on j.codigo=s.juego_codigo
  where s.id=p_sorteo_id;

  if not found then
    return;
  end if;

  select coalesce(sum(a.importe),0)
  into v_total_bote
  from public.apuestas a
  where a.sorteo_id=p_sorteo_id
    and a.fuente_fondos='bote';

  if v_movimiento_id is not null then
    select abs(m.importe)
    into v_gasto_actual
    from public.movimientos_bote m
    where m.id=v_movimiento_id;

    v_gasto_actual := coalesce(v_gasto_actual,0);
  end if;

  if v_total_bote > 0 then
    select coalesce(r.saldo_final,0)
    into v_saldo_actual
    from public.resumen_anual r
    where r.anio=extract(year from v_fecha)::smallint;

    v_disponible := coalesce(v_saldo_actual,0) + v_gasto_actual;

    if v_total_bote > v_disponible then
      raise exception 'Saldo insuficiente en el bote. Disponible: % €', v_disponible;
    end if;

    if v_movimiento_id is null then
      insert into public.movimientos_bote(
        temporada_id,fecha,anio,mes,tipo,concepto,importe,observaciones
      )
      values(
        v_temporada_id,
        v_fecha,
        extract(year from v_fecha)::smallint,
        extract(month from v_fecha)::smallint,
        'gasto',
        'Jugada '||v_juego_nombre||' '||to_char(v_fecha,'DD/MM/YYYY'),
        -v_total_bote,
        'Jugada financiada con el bote'
      )
      returning id into v_movimiento_id;

      update public.sorteos
      set movimiento_gasto_bote_id=v_movimiento_id
      where id=p_sorteo_id;
    else
      update public.movimientos_bote
      set fecha=v_fecha,
          anio=extract(year from v_fecha)::smallint,
          mes=extract(month from v_fecha)::smallint,
          concepto='Jugada '||v_juego_nombre||' '||to_char(v_fecha,'DD/MM/YYYY'),
          importe=-v_total_bote,
          anulado_at=null,
          anulado_por=null,
          observaciones='Jugada financiada con el bote'
      where id=v_movimiento_id;
    end if;
  elsif v_movimiento_id is not null then
    update public.sorteos
    set movimiento_gasto_bote_id=null
    where id=p_sorteo_id;

    delete from public.movimientos_bote
    where id=v_movimiento_id;
  end if;
end;
$$;

revoke all on function private.sync_gasto_bote_sorteo(bigint) from public, anon;
grant execute on function private.sync_gasto_bote_sorteo(bigint)
  to authenticated, service_role;

create or replace function private.apuestas_sync_gasto_bote_trigger()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if tg_op='DELETE' then
    perform private.sync_gasto_bote_sorteo(old.sorteo_id);
    return old;
  end if;

  perform private.sync_gasto_bote_sorteo(new.sorteo_id);

  if tg_op='UPDATE' and old.sorteo_id is distinct from new.sorteo_id then
    perform private.sync_gasto_bote_sorteo(old.sorteo_id);
  end if;

  return new;
end;
$$;

revoke all on function private.apuestas_sync_gasto_bote_trigger()
  from public, anon;
grant execute on function private.apuestas_sync_gasto_bote_trigger()
  to authenticated, service_role;

drop trigger if exists apuestas_sync_gasto_bote on public.apuestas;
create trigger apuestas_sync_gasto_bote
after insert or update or delete on public.apuestas
for each row execute function private.apuestas_sync_gasto_bote_trigger();

create or replace function public.eliminar_sorteo(p_sorteo_id bigint)
returns boolean
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_movimiento_premio_id bigint;
  v_movimiento_gasto_id bigint;
begin
  select s.movimiento_bote_id,s.movimiento_gasto_bote_id
  into v_movimiento_premio_id,v_movimiento_gasto_id
  from public.sorteos s
  where s.id=p_sorteo_id;

  if not found then
    raise exception 'Sorteo no encontrado';
  end if;

  delete from public.sorteos
  where id=p_sorteo_id;

  if v_movimiento_premio_id is not null then
    delete from public.movimientos_bote m
    where m.id=v_movimiento_premio_id
      and not exists(
        select 1 from public.sorteos s where s.movimiento_bote_id=m.id
      );
  end if;

  if v_movimiento_gasto_id is not null then
    delete from public.movimientos_bote m
    where m.id=v_movimiento_gasto_id
      and not exists(
        select 1 from public.sorteos s where s.movimiento_gasto_bote_id=m.id
      );
  end if;

  return true;
end;
$$;

revoke all on function public.eliminar_sorteo(bigint) from public, anon;
grant execute on function public.eliminar_sorteo(bigint) to authenticated;
