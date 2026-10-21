-- 0019_temporadas_historicas_y_cambio_anio.sql
-- Completa 2012-2025 como temporadas históricas y añade el flujo seguro
-- para preparar y activar temporadas futuras.

alter table public.temporadas
  alter column cuota_semanal drop not null,
  alter column numero_semanas drop not null;

insert into public.temporadas(
  anio,fecha_inicio,fecha_fin,cuota_semanal,numero_semanas,activa,observaciones
)
select
  r.anio,
  make_date(r.anio,1,1),
  make_date(r.anio,12,31),
  null,
  null,
  false,
  'Temporada histórica creada desde el resumen económico existente'
from public.resumen_anual r
where r.anio between 2012 and 2025
  and not exists(
    select 1 from public.temporadas t where t.anio=r.anio
  )
order by r.anio;

create or replace function public.crear_temporada_preparada(
  p_anio smallint,
  p_fecha_inicio date,
  p_fecha_fin date,
  p_cuota_semanal numeric,
  p_numero_semanas smallint,
  p_copiar_combinaciones boolean default true,
  p_copiar_programaciones boolean default true,
  p_observaciones text default null
)
returns bigint
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_origen_id bigint;
  v_origen_anio smallint;
  v_nueva_id bigint;
begin
  if not exists(
    select 1 from public.administradores a
    where a.user_id=(select auth.uid()) and a.activo=true
  ) then
    raise exception 'No tienes permisos para crear temporadas';
  end if;

  if p_fecha_fin < p_fecha_inicio then
    raise exception 'La fecha final no puede ser anterior a la inicial';
  end if;

  if p_cuota_semanal is null or p_cuota_semanal < 0 then
    raise exception 'La cuota semanal no es válida';
  end if;

  if p_numero_semanas is null or p_numero_semanas < 1 or p_numero_semanas > 53 then
    raise exception 'El número de semanas debe estar entre 1 y 53';
  end if;

  select t.id,t.anio
  into v_origen_id,v_origen_anio
  from public.temporadas t
  where t.activa=true
  limit 1;

  if v_origen_id is null then
    raise exception 'No hay una temporada activa de referencia';
  end if;

  if p_anio <= v_origen_anio then
    raise exception 'La nueva temporada debe ser posterior a la temporada activa';
  end if;

  if exists(select 1 from public.temporadas t where t.anio=p_anio) then
    raise exception 'Ya existe la temporada %',p_anio;
  end if;

  insert into public.temporadas(
    anio,fecha_inicio,fecha_fin,cuota_semanal,numero_semanas,activa,observaciones
  )
  values(
    p_anio,p_fecha_inicio,p_fecha_fin,p_cuota_semanal,p_numero_semanas,false,
    coalesce(p_observaciones,'Temporada preparada desde '||v_origen_anio)
  )
  returning id into v_nueva_id;

  if p_copiar_combinaciones then
    insert into public.combinaciones(
      temporada_id,numero_orden,nombre,numeros,activa,juego_codigo
    )
    select
      v_nueva_id,c.numero_orden,c.nombre,c.numeros,c.activa,c.juego_codigo
    from public.combinaciones c
    where c.temporada_id=v_origen_id
    order by c.numero_orden;
  end if;

  if p_copiar_programaciones then
    insert into public.programacion_juegos(
      temporada_id,juego_codigo,activa,dias_semana,importe_por_apuesta,
      observaciones,nombre,usar_combinaciones_fijas,datos_apuesta,
      importe_total,fuente_fondos
    )
    select
      v_nueva_id,p.juego_codigo,p.activa,p.dias_semana,p.importe_por_apuesta,
      p.observaciones,p.nombre,p.usar_combinaciones_fijas,p.datos_apuesta,
      p.importe_total,p.fuente_fondos
    from public.programacion_juegos p
    where p.temporada_id=v_origen_id
    order by p.id;
  end if;

  return v_nueva_id;
end;
$$;

revoke all on function public.crear_temporada_preparada(
  smallint,date,date,numeric,smallint,boolean,boolean,text
) from public,anon;

grant execute on function public.crear_temporada_preparada(
  smallint,date,date,numeric,smallint,boolean,boolean,text
) to authenticated;

create or replace function public.activar_temporada(p_temporada_id bigint)
returns boolean
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actual_id bigint;
  v_actual_anio smallint;
  v_nueva_anio smallint;
  v_fecha_inicio date;
  v_arrastre numeric(12,2);
begin
  if not exists(
    select 1 from public.administradores a
    where a.user_id=(select auth.uid()) and a.activo=true
  ) then
    raise exception 'No tienes permisos para activar temporadas';
  end if;

  select t.id,t.anio
  into v_actual_id,v_actual_anio
  from public.temporadas t
  where t.activa=true
  limit 1;

  select t.anio,t.fecha_inicio
  into v_nueva_anio,v_fecha_inicio
  from public.temporadas t
  where t.id=p_temporada_id and t.activa=false;

  if not found then
    raise exception 'La temporada no existe o ya está activa';
  end if;

  if v_actual_id is null then
    raise exception 'No hay una temporada activa que cerrar';
  end if;

  if v_nueva_anio <= v_actual_anio then
    raise exception 'Solo se puede activar una temporada posterior a la actual';
  end if;

  if current_date < v_fecha_inicio then
    raise exception 'La temporada % no puede activarse antes del %',
      v_nueva_anio,to_char(v_fecha_inicio,'DD/MM/YYYY');
  end if;

  select coalesce(r.saldo_final,0)
  into v_arrastre
  from public.resumen_anual r
  where r.anio=v_actual_anio;

  update public.temporadas set activa=false,updated_at=now()
  where id=v_actual_id;

  update public.temporadas set activa=true,updated_at=now()
  where id=p_temporada_id;

  update public.movimientos_cuotas
  set temporada_id=p_temporada_id
  where temporada_id=v_actual_id
    and anulado_at is null
    and aplicar_anio=v_nueva_anio;

  if not exists(
    select 1 from public.movimientos_bote m
    where m.temporada_id=p_temporada_id
      and m.anio=v_nueva_anio
      and m.tipo='arrastre'
      and m.anulado_at is null
  ) then
    insert into public.movimientos_bote(
      temporada_id,fecha,anio,mes,tipo,concepto,importe,observaciones
    )
    values(
      p_temporada_id,make_date(v_nueva_anio,1,1),v_nueva_anio,1,
      'arrastre','Arrastre temporada '||v_actual_anio,
      coalesce(v_arrastre,0),
      'Saldo final de '||v_actual_anio||' trasladado automáticamente'
    );
  end if;

  perform private.generar_sorteos_programados(current_date);

  return true;
end;
$$;

revoke all on function public.activar_temporada(bigint) from public,anon;
grant execute on function public.activar_temporada(bigint) to authenticated;
