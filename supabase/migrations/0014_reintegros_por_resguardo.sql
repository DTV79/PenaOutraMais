-- 0014_reintegros_por_resguardo.sql
-- Las 10 combinaciones habituales de La Primitiva se validan en dos resguardos:
-- I-V comparten reintegro y VI-X comparten otro reintegro.

update public.apuestas a
set datos=jsonb_set(
  a.datos,
  '{resguardo}',
  to_jsonb(case when c.numero_orden between 1 and 5 then 1 else 2 end),
  true
)
from public.combinaciones c
where c.id=a.origen_combinacion_id
  and a.tipo='fija';

create or replace function private.generar_sorteos_programados(p_fecha date default current_date)
returns integer
language plpgsql
security invoker
set search_path=''
as $$
declare
  r record;
  v_dia date;
  v_sorteo_id bigint;
  v_count integer := 0;
begin
  for r in
    select p.*
    from public.programacion_juegos p
    join public.temporadas t on t.id=p.temporada_id
    where p.activa=true
      and t.activa=true
  loop
    for v_dia in
      select gs::date
      from generate_series(p_fecha,p_fecha+6,interval '1 day') gs
      where extract(isodow from gs)::smallint=any(r.dias_semana)
      order by gs
    loop
      select s.id
      into v_sorteo_id
      from public.sorteos s
      where s.juego_codigo=r.juego_codigo
        and s.fecha=v_dia
        and s.nombre is null
      limit 1;

      if v_sorteo_id is null then
        insert into public.sorteos(
          temporada_id,juego_codigo,fecha,nombre,estado,automatico
        )
        values(
          r.temporada_id,r.juego_codigo,v_dia,null,'pendiente',true
        )
        returning id into v_sorteo_id;
      end if;

      insert into public.apuestas(
        sorteo_id,origen_combinacion_id,tipo,descripcion,importe,fuente_fondos,datos
      )
      select
        v_sorteo_id,
        c.id,
        'fija',
        coalesce(c.nombre,'Combinación '||c.numero_orden),
        r.importe_por_apuesta,
        'cuotas',
        jsonb_build_object(
          'numeros',to_jsonb(c.numeros),
          'reintegro',null,
          'resguardo',case when c.numero_orden between 1 and 5 then 1 else 2 end
        )
      from public.combinaciones c
      where c.temporada_id=r.temporada_id
        and c.juego_codigo=r.juego_codigo
        and c.activa=true
      on conflict (sorteo_id,origen_combinacion_id)
        where origen_combinacion_id is not null
      do nothing;

      v_count:=v_count+1;
    end loop;
  end loop;

  return v_count;
end;
$$;
