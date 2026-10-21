-- 0017_eliminar_movimientos_bote_anulados.sql
-- Permite eliminar definitivamente un movimiento del bote solo después
-- de haber sido anulado y siempre que no esté vinculado a un sorteo.

create or replace function public.eliminar_movimiento_bote(p_movimiento_id bigint)
returns boolean
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_anulado_at timestamptz;
begin
  if not exists(
    select 1
    from public.administradores a
    where a.user_id=(select auth.uid())
      and a.activo=true
  ) then
    raise exception 'No tienes permisos para eliminar movimientos';
  end if;

  select m.anulado_at
  into v_anulado_at
  from public.movimientos_bote m
  where m.id=p_movimiento_id;

  if not found then
    raise exception 'Movimiento no encontrado';
  end if;

  if v_anulado_at is null then
    raise exception 'Primero debes anular el movimiento';
  end if;

  if exists(
    select 1
    from public.sorteos s
    where s.movimiento_bote_id=p_movimiento_id
       or s.movimiento_gasto_bote_id=p_movimiento_id
  ) then
    raise exception 'Este movimiento está vinculado a un sorteo y no puede eliminarse directamente';
  end if;

  delete from public.movimientos_bote
  where id=p_movimiento_id;

  return true;
end;
$$;

revoke all on function public.eliminar_movimiento_bote(bigint)
  from public,anon;

grant execute on function public.eliminar_movimiento_bote(bigint)
  to authenticated;
