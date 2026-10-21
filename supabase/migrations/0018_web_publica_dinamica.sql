-- 0018_web_publica_dinamica.sql
-- Expone a la web de socios únicamente datos agregados/no sensibles y
-- mantiene un resumen público de cuotas sincronizado automáticamente.

create table if not exists public.resumen_cuotas_publico (
  temporada_id bigint primary key references public.temporadas(id) on delete cascade,
  socios_activos integer not null default 0,
  socios_al_corriente integer not null default 0,
  socios_pendientes integer not null default 0,
  previsto numeric(12,2) not null default 0,
  cobrado numeric(12,2) not null default 0,
  pendiente numeric(12,2) not null default 0,
  adelantado_futuro numeric(12,2) not null default 0,
  jugado_con_cuotas numeric(12,2) not null default 0,
  disponible numeric(12,2) not null default 0,
  actualizado_at timestamptz not null default now()
);

alter table public.resumen_cuotas_publico enable row level security;

drop policy if exists resumen_cuotas_publico_read on public.resumen_cuotas_publico;
create policy resumen_cuotas_publico_read
on public.resumen_cuotas_publico
for select
to anon,authenticated
using (true);

revoke all on public.resumen_cuotas_publico from anon;
grant select on public.resumen_cuotas_publico to anon;
grant select on public.resumen_cuotas_publico to authenticated;

create or replace function private.refrescar_resumen_cuotas_publico(p_temporada_id bigint)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  v_anio integer;
  v_cuota numeric(12,2);
  v_socios integer;
  v_al_corriente integer;
  v_pendientes integer;
  v_previsto numeric(12,2);
  v_cobrado numeric(12,2);
  v_futuro numeric(12,2);
  v_jugado numeric(12,2);
begin
  select t.anio,t.cuota_anual
  into v_anio,v_cuota
  from public.temporadas t
  where t.id=p_temporada_id;

  if not found then return; end if;

  select count(*)::integer
  into v_socios
  from public.socios s
  where s.fecha_baja is null
     or extract(year from s.fecha_baja)::integer >= v_anio;

  v_previsto := coalesce(v_socios,0) * coalesce(v_cuota,0);

  with aportaciones as (
    select
      s.id,
      coalesce(sum(
        case
          when m.anulado_at is not null then 0
          when m.tipo='saldo_a_favor' and m.aplicar_anio is distinct from v_anio then 0
          when m.aplicar_anio is not null and m.aplicar_anio is distinct from v_anio then 0
          else m.importe
        end
      ),0) as aportado
    from public.socios s
    left join public.movimientos_cuotas m
      on m.socio_id=s.id
     and m.temporada_id=p_temporada_id
    where s.fecha_baja is null
       or extract(year from s.fecha_baja)::integer >= v_anio
    group by s.id
  )
  select
    count(*) filter (where aportado >= v_cuota)::integer,
    count(*) filter (where aportado < v_cuota)::integer
  into v_al_corriente,v_pendientes
  from aportaciones;

  select coalesce(sum(
    case
      when m.anulado_at is not null then 0
      when m.tipo='saldo_a_favor' and m.aplicar_anio is distinct from v_anio then 0
      when m.aplicar_anio is not null and m.aplicar_anio is distinct from v_anio then 0
      else m.importe
    end
  ),0)
  into v_cobrado
  from public.movimientos_cuotas m
  where m.temporada_id=p_temporada_id;

  select coalesce(sum(m.importe),0)
  into v_futuro
  from public.movimientos_cuotas m
  where m.temporada_id=p_temporada_id
    and m.anulado_at is null
    and m.tipo='saldo_a_favor'
    and m.aplicar_anio is not null
    and m.aplicar_anio > v_anio;

  select coalesce(sum(a.importe),0)
  into v_jugado
  from public.apuestas a
  join public.sorteos s on s.id=a.sorteo_id
  where s.temporada_id=p_temporada_id
    and a.fuente_fondos='cuotas';

  insert into public.resumen_cuotas_publico(
    temporada_id,socios_activos,socios_al_corriente,socios_pendientes,
    previsto,cobrado,pendiente,adelantado_futuro,
    jugado_con_cuotas,disponible,actualizado_at
  )
  values(
    p_temporada_id,
    coalesce(v_socios,0),
    coalesce(v_al_corriente,0),
    coalesce(v_pendientes,0),
    coalesce(v_previsto,0),
    coalesce(v_cobrado,0),
    greatest(coalesce(v_previsto,0)-coalesce(v_cobrado,0),0),
    coalesce(v_futuro,0),
    coalesce(v_jugado,0),
    coalesce(v_cobrado,0)-coalesce(v_jugado,0),
    now()
  )
  on conflict (temporada_id) do update
  set socios_activos=excluded.socios_activos,
      socios_al_corriente=excluded.socios_al_corriente,
      socios_pendientes=excluded.socios_pendientes,
      previsto=excluded.previsto,
      cobrado=excluded.cobrado,
      pendiente=excluded.pendiente,
      adelantado_futuro=excluded.adelantado_futuro,
      jugado_con_cuotas=excluded.jugado_con_cuotas,
      disponible=excluded.disponible,
      actualizado_at=excluded.actualizado_at;
end;
$$;

revoke all on function private.refrescar_resumen_cuotas_publico(bigint) from public;

create or replace function private.trigger_refrescar_resumen_cuotas_publico()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_temporada_id bigint;
begin
  if tg_table_name='movimientos_cuotas' then
    v_temporada_id:=coalesce(new.temporada_id,old.temporada_id);
    perform private.refrescar_resumen_cuotas_publico(v_temporada_id);
  elsif tg_table_name='apuestas' then
    select s.temporada_id
    into v_temporada_id
    from public.sorteos s
    where s.id=coalesce(new.sorteo_id,old.sorteo_id);

    if v_temporada_id is not null then
      perform private.refrescar_resumen_cuotas_publico(v_temporada_id);
    end if;
  elsif tg_table_name='socios' then
    for v_temporada_id in select id from public.temporadas loop
      perform private.refrescar_resumen_cuotas_publico(v_temporada_id);
    end loop;
  elsif tg_table_name='temporadas' then
    v_temporada_id:=coalesce(new.id,old.id);
    perform private.refrescar_resumen_cuotas_publico(v_temporada_id);
  end if;

  return coalesce(new,old);
end;
$$;

revoke all on function private.trigger_refrescar_resumen_cuotas_publico() from public;

drop trigger if exists resumen_publico_mov_cuotas on public.movimientos_cuotas;
create trigger resumen_publico_mov_cuotas
after insert or update or delete on public.movimientos_cuotas
for each row execute function private.trigger_refrescar_resumen_cuotas_publico();

drop trigger if exists resumen_publico_apuestas on public.apuestas;
create trigger resumen_publico_apuestas
after insert or update or delete on public.apuestas
for each row execute function private.trigger_refrescar_resumen_cuotas_publico();

drop trigger if exists resumen_publico_socios on public.socios;
create trigger resumen_publico_socios
after insert or update or delete on public.socios
for each row execute function private.trigger_refrescar_resumen_cuotas_publico();

drop trigger if exists resumen_publico_temporadas on public.temporadas;
create trigger resumen_publico_temporadas
after insert or update on public.temporadas
for each row execute function private.trigger_refrescar_resumen_cuotas_publico();

drop policy if exists programacion_juegos_public_read on public.programacion_juegos;
create policy programacion_juegos_public_read
on public.programacion_juegos
for select
to anon,authenticated
using (activa=true);

drop policy if exists sorteos_public_read on public.sorteos;
create policy sorteos_public_read
on public.sorteos
for select
to anon,authenticated
using (true);

drop policy if exists apuestas_public_read on public.apuestas;
create policy apuestas_public_read
on public.apuestas
for select
to anon,authenticated
using (true);

revoke all on public.programacion_juegos from anon;
grant select(
  id,temporada_id,juego_codigo,nombre,activa,dias_semana,
  importe_total,fuente_fondos,usar_combinaciones_fijas,datos_apuesta
) on public.programacion_juegos to anon;

revoke all on public.sorteos from anon;
grant select(
  id,temporada_id,juego_codigo,fecha,nombre,estado,resultado,
  fuente_url,comprobado_at,automatico,programacion_id
) on public.sorteos to anon;

revoke all on public.apuestas from anon;
grant select(
  id,sorteo_id,origen_combinacion_id,programacion_id,tipo,
  descripcion,importe,fuente_fondos,datos,comprobada,
  categoria_premio,premio,detalle_resultado
) on public.apuestas to anon;

revoke all on public.movimientos_bote from anon;
grant select(
  id,temporada_id,fecha,anio,mes,tipo,concepto,importe,observaciones
) on public.movimientos_bote to anon;

select private.refrescar_resumen_cuotas_publico(id)
from public.temporadas;

notify pgrst, 'reload schema';
