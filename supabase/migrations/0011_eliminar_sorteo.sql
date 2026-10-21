-- 0011_eliminar_sorteo.sql
-- Permite al administrador eliminar un sorteo creado por error.
-- Las apuestas se eliminan por ON DELETE CASCADE.
-- Si el sorteo tenía un movimiento de premio vinculado al bote,
-- se elimina también y el resumen anual se recalcula por el trigger existente.

create or replace function public.eliminar_sorteo(p_sorteo_id bigint)
returns boolean
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_movimiento_bote_id bigint;
begin
  select s.movimiento_bote_id
  into v_movimiento_bote_id
  from public.sorteos s
  where s.id=p_sorteo_id;

  if not found then
    raise exception 'Sorteo no encontrado';
  end if;

  delete from public.sorteos
  where id=p_sorteo_id;

  if v_movimiento_bote_id is not null then
    delete from public.movimientos_bote m
    where m.id=v_movimiento_bote_id
      and not exists (
        select 1
        from public.sorteos s
        where s.movimiento_bote_id=m.id
      );
  end if;

  return true;
end;
$$;

revoke all on function public.eliminar_sorteo(bigint) from public, anon;
grant execute on function public.eliminar_sorteo(bigint) to authenticated;
