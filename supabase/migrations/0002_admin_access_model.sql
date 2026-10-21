-- 0002_admin_access_model.sql
-- Modelo de autorización para la zona de administración.

create table if not exists public.administradores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists administradores_set_updated_at on public.administradores;
create trigger administradores_set_updated_at
before update on public.administradores
for each row execute function private.set_updated_at();

alter table public.administradores enable row level security;

revoke all on public.administradores from anon, authenticated;
grant select on public.administradores to authenticated;

drop policy if exists "administradores_lee_su_registro" on public.administradores;
create policy "administradores_lee_su_registro"
on public.administradores
for select to authenticated
using (user_id = (select auth.uid()) and activo = true);

grant select, insert, update, delete on public.socios to authenticated;
grant select, insert, update, delete on public.movimientos_cuotas to authenticated;
grant insert, update, delete on public.temporadas to authenticated;
grant insert, update, delete on public.combinaciones to authenticated;
grant insert, update, delete on public.resumen_anual to authenticated;
grant insert, update, delete on public.movimientos_bote to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Datos privados: solo administradores.
create policy "socios_admin_select" on public.socios for select to authenticated
using (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));
create policy "socios_admin_insert" on public.socios for insert to authenticated
with check (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));
create policy "socios_admin_update" on public.socios for update to authenticated
using (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo))
with check (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));
create policy "socios_admin_delete" on public.socios for delete to authenticated
using (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));

create policy "cuotas_admin_select" on public.movimientos_cuotas for select to authenticated
using (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));
create policy "cuotas_admin_insert" on public.movimientos_cuotas for insert to authenticated
with check (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));
create policy "cuotas_admin_update" on public.movimientos_cuotas for update to authenticated
using (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo))
with check (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));
create policy "cuotas_admin_delete" on public.movimientos_cuotas for delete to authenticated
using (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));

-- Tablas con lectura pública: las mutaciones requieren administrador.
create policy "temporadas_admin_insert" on public.temporadas for insert to authenticated
with check (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));
create policy "temporadas_admin_update" on public.temporadas for update to authenticated
using (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo))
with check (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));
create policy "temporadas_admin_delete" on public.temporadas for delete to authenticated
using (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));

create policy "combinaciones_admin_insert" on public.combinaciones for insert to authenticated
with check (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));
create policy "combinaciones_admin_update" on public.combinaciones for update to authenticated
using (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo))
with check (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));
create policy "combinaciones_admin_delete" on public.combinaciones for delete to authenticated
using (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));

create policy "resumen_admin_insert" on public.resumen_anual for insert to authenticated
with check (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));
create policy "resumen_admin_update" on public.resumen_anual for update to authenticated
using (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo))
with check (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));
create policy "resumen_admin_delete" on public.resumen_anual for delete to authenticated
using (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));

create policy "bote_admin_insert" on public.movimientos_bote for insert to authenticated
with check (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));
create policy "bote_admin_update" on public.movimientos_bote for update to authenticated
using (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo))
with check (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));
create policy "bote_admin_delete" on public.movimientos_bote for delete to authenticated
using (exists (select 1 from public.administradores a where a.user_id=(select auth.uid()) and a.activo));
