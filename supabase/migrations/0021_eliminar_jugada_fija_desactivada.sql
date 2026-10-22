-- 0021_eliminar_jugada_fija_desactivada.sql
-- Permite eliminar una jugada fija únicamente después de desactivarla.
-- Protege cualquier jugada que ya forme parte del histórico.

create or replace function public.eliminar_jugada_fija(p_jugada_fija_id bigint)
returns boolean
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_jugada record;
  v_sorteo record;
begin
  if not exists (
    select 1
    from public.administradores a
    where a.user_id=(select auth.uid())
      and a.activo=true
  ) then
    raise exception 'No tienes permisos para eliminar jugadas fijas';
  end if;

  select jf.id,jf.nombre,jf.activa
  into v_jugada
  from public.jugadas_fijas jf
  where jf.id=p_jugada_fija_id;

  if not found then
    raise exception 'La jugada fija no existe';
  end if;

  if v_jugada.activa then
    raise exception 'Desactiva primero la jugada antes de eliminarla';
  end if;

  if exists (
    select 1
    from public.sorteos s
    join public.programacion_juegos p on p.id=s.programacion_id
    where p.jugada_fija_id=p_jugada_fija_id
      and (
        s.estado='comprobado'
        or s.fecha < current_date
      )
  ) or exists (
    select 1
    from public.apuestas a
    join public.combinaciones c on c.id=a.origen_combinacion_id
    join public.sorteos s on s.id=a.sorteo_id
    where c.jugada_fija_id=p_jugada_fija_id
      and (
        s.estado='comprobado'
        or s.fecha < current_date
      )
  ) then
    raise exception
      'No se puede eliminar esta jugada porque ya tiene sorteos históricos. Puedes mantenerla desactivada.';
  end if;

  for v_sorteo in
    select distinct s.id
    from public.sorteos s
    join public.programacion_juegos p on p.id=s.programacion_id
    where p.jugada_fija_id=p_jugada_fija_id
      and s.estado<>'comprobado'
      and s.fecha>=current_date
  loop
    perform public.eliminar_sorteo(v_sorteo.id);
  end loop;

  delete from public.programacion_juegos
  where jugada_fija_id=p_jugada_fija_id;

  delete from public.jugadas_fijas
  where id=p_jugada_fija_id;

  return true;
end;
$$;

revoke all on function public.eliminar_jugada_fija(bigint) from public,anon;
grant execute on function public.eliminar_jugada_fija(bigint) to authenticated;
