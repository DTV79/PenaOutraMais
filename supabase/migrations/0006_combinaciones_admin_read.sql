-- 0006_combinaciones_admin_read.sql
-- La lectura pública sigue mostrando solo combinaciones activas.
-- Los administradores necesitan leer también las inactivas para poder reactivarlas.

drop policy if exists "combinaciones_admin_read" on public.combinaciones;

create policy "combinaciones_admin_read"
on public.combinaciones
for select
to authenticated
using (
  exists (
    select 1
    from public.administradores a
    where a.user_id = (select auth.uid())
      and a.activo = true
  )
);
