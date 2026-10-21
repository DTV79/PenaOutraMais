-- 0016_programaciones_multiples.sql
-- Convierte la programación habitual en un sistema genérico de apuestas
-- recurrentes para Primitiva, Euromillones, Bonoloto y Lotería Nacional.

alter table public.programacion_juegos
  drop constraint if exists programacion_juegos_temporada_id_juego_codigo_key;

alter table public.programacion_juegos
  add column if not exists nombre text,
  add column if not exists usar_combinaciones_fijas boolean not null default false,
  add column if not exists datos_apuesta jsonb not null default '{}'::jsonb,
  add column if not exists importe_total numeric(10,2) not null default 0,
  add column if not exists fuente_fondos text not null default 'cuotas';

update public.programacion_juegos p
set nombre=coalesce(
      nombre,
      case when juego_codigo='primitiva'
        then 'Primitiva habitual'
        else 'Programación '||id end
    ),
    usar_combinaciones_fijas=case
      when juego_codigo='primitiva' and id=1 then true
      else usar_combinaciones_fijas
    end,
    importe_total=case
      when id=1 and juego_codigo='primitiva' then
        importe_por_apuesta * (
          select count(*)
          from public.combinaciones c
          where c.temporada_id=p.temporada_id
            and c.juego_codigo=p.juego_codigo
            and c.activa=true
        )
      when importe_total=0 then importe_por_apuesta
      else importe_total
    end;

alter table public.programacion_juegos
  alter column nombre set not null;

alter table public.programacion_juegos
  add constraint programacion_fuente_fondos_valida
  check (fuente_fondos in ('cuotas','bote'));

alter table public.programacion_juegos
  add constraint programacion_importe_total_valido
  check (importe_total >= 0);

alter table public.programacion_juegos
  add constraint programacion_datos_objeto
  check (jsonb_typeof(datos_apuesta)='object');

alter table public.sorteos
  add column if not exists programacion_id bigint
    references public.programacion_juegos(id) on delete set null;

alter table public.apuestas
  add column if not exists programacion_id bigint
    references public.programacion_juegos(id) on delete set null;

alter table public.apuestas
  drop constraint if exists apuestas_tipo_valido;

alter table public.apuestas
  add constraint apuestas_tipo_valido
  check (tipo in ('fija','especial','programada'));

create unique index if not exists sorteos_programacion_fecha_unica
  on public.sorteos(programacion_id,fecha)
  where programacion_id is not null;

create unique index if not exists apuestas_programacion_sorteo_unica
  on public.apuestas(sorteo_id,programacion_id)
  where programacion_id is not null
    and origen_combinacion_id is null;

update public.sorteos s
set programacion_id=1
where s.programacion_id is null
  and s.automatico=true
  and s.juego_codigo='primitiva'
  and s.temporada_id=(
    select id from public.temporadas where activa=true limit 1
  );

update public.apuestas a
set programacion_id=s.programacion_id
from public.sorteos s
where a.sorteo_id=s.id
  and a.programacion_id is null
  and s.programacion_id is not null;

create or replace function private.generar_sorteos_programados(
  p_fecha date default current_date
)
returns integer
language plpgsql
security invoker
set search_path=''
as $$
declare
  p record;
  v_dia date;
  v_sorteo_id bigint;
  v_count integer := 0;
  v_combo_count integer;
  v_nombre_sorteo text;
  old_draw record;
begin
  for old_draw in
    select s.id
    from public.sorteos s
    join public.programacion_juegos pj on pj.id=s.programacion_id
    where s.automatico=true
      and s.fecha between p_fecha and p_fecha+6
      and (
        pj.activa=false
        or not (
          extract(isodow from s.fecha)::smallint=any(pj.dias_semana)
        )
      )
  loop
    perform public.eliminar_sorteo(old_draw.id);
  end loop;

  for p in
    select pj.*
    from public.programacion_juegos pj
    join public.temporadas t on t.id=pj.temporada_id
    where pj.activa=true
      and t.activa=true
  loop
    for v_dia in
      select gs::date
      from generate_series(p_fecha,p_fecha+6,interval '1 day') gs
      where extract(isodow from gs)::smallint=any(p.dias_semana)
      order by gs
    loop
      v_nombre_sorteo := case
        when p.usar_combinaciones_fijas=true
          and p.juego_codigo='primitiva'
          and lower(p.nombre)='primitiva habitual'
        then null
        else p.nombre
      end;

      select s.id
      into v_sorteo_id
      from public.sorteos s
      where s.programacion_id=p.id
        and s.fecha=v_dia
      limit 1;

      if v_sorteo_id is null then
        select s.id
        into v_sorteo_id
        from public.sorteos s
        where s.programacion_id is null
          and s.automatico=true
          and s.juego_codigo=p.juego_codigo
          and s.fecha=v_dia
          and coalesce(s.nombre,'')=coalesce(v_nombre_sorteo,'')
        limit 1;

        if v_sorteo_id is not null then
          update public.sorteos
          set programacion_id=p.id
          where id=v_sorteo_id;
        end if;
      end if;

      if v_sorteo_id is null then
        insert into public.sorteos(
          temporada_id,juego_codigo,fecha,nombre,
          estado,automatico,programacion_id
        )
        values(
          p.temporada_id,p.juego_codigo,v_dia,v_nombre_sorteo,
          'pendiente',true,p.id
        )
        returning id into v_sorteo_id;
      end if;

      if p.usar_combinaciones_fijas then
        select count(*)
        into v_combo_count
        from public.combinaciones c
        where c.temporada_id=p.temporada_id
          and c.juego_codigo=p.juego_codigo
          and c.activa=true;

        if v_combo_count=0 then
          raise exception
            'La programación % no tiene combinaciones fijas activas',
            p.nombre;
        end if;

        insert into public.apuestas(
          sorteo_id,origen_combinacion_id,programacion_id,tipo,
          descripcion,importe,fuente_fondos,datos
        )
        select
          v_sorteo_id,
          c.id,
          p.id,
          'fija',
          coalesce(c.nombre,'Combinación '||c.numero_orden),
          round(p.importe_total / v_combo_count,2),
          p.fuente_fondos,
          jsonb_build_object(
            'numeros',to_jsonb(c.numeros),
            'reintegro',null,
            'resguardo',
              case when c.numero_orden between 1 and 5 then 1 else 2 end
          )
        from public.combinaciones c
        where c.temporada_id=p.temporada_id
          and c.juego_codigo=p.juego_codigo
          and c.activa=true
        on conflict (sorteo_id,origen_combinacion_id)
          where origen_combinacion_id is not null
        do update
          set programacion_id=excluded.programacion_id,
              importe=excluded.importe,
              fuente_fondos=excluded.fuente_fondos,
              updated_at=now();
      else
        insert into public.apuestas(
          sorteo_id,programacion_id,tipo,descripcion,
          importe,fuente_fondos,datos
        )
        values(
          v_sorteo_id,p.id,'programada',p.nombre,
          p.importe_total,p.fuente_fondos,p.datos_apuesta
        )
        on conflict (sorteo_id,programacion_id)
          where programacion_id is not null
            and origen_combinacion_id is null
        do update
          set descripcion=excluded.descripcion,
              importe=excluded.importe,
              fuente_fondos=excluded.fuente_fondos,
              datos=excluded.datos,
              updated_at=now();
      end if;

      v_count:=v_count+1;
    end loop;
  end loop;

  return v_count;
end;
$$;

grant execute on function private.generar_sorteos_programados(date)
  to authenticated,service_role;

create or replace function public.refrescar_sorteos_programados()
returns integer
language plpgsql
security invoker
set search_path=''
as $$
begin
  if not exists(
    select 1
    from public.administradores a
    where a.user_id=(select auth.uid())
      and a.activo=true
  ) then
    raise exception 'No tienes permisos para actualizar las programaciones';
  end if;

  return private.generar_sorteos_programados(current_date);
end;
$$;

revoke all on function public.refrescar_sorteos_programados()
  from public,anon;
grant execute on function public.refrescar_sorteos_programados()
  to authenticated;
