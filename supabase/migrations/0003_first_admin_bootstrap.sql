-- 0003_first_admin_bootstrap.sql
-- Permite que el primer y único usuario Auth se dé de alta como primer administrador.
-- La condición se cierra automáticamente cuando ya existe un administrador activo.

create or replace function private.can_bootstrap_first_admin(candidate_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    candidate_user_id = (select auth.uid())
    and (select count(*) from auth.users) = 1
    and exists (
      select 1 from auth.users u where u.id = candidate_user_id
    )
    and not exists (
      select 1 from public.administradores a where a.activo = true
    );
$$;

revoke all on function private.can_bootstrap_first_admin(uuid) from public;
revoke all on function private.can_bootstrap_first_admin(uuid) from anon;
grant usage on schema private to authenticated;
grant execute on function private.can_bootstrap_first_admin(uuid) to authenticated;

grant insert on public.administradores to authenticated;

drop policy if exists "administradores_bootstrap_primero" on public.administradores;
create policy "administradores_bootstrap_primero"
on public.administradores
for insert
to authenticated
with check (
  activo = true
  and private.can_bootstrap_first_admin(user_id)
);
