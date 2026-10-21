-- 0010_private_trigger_permissions.sql
-- Los triggers de movimientos_bote son SECURITY INVOKER y llaman a funciones
-- internas del esquema private. Se conceden únicamente los permisos mínimos
-- necesarios a las operaciones autenticadas y al backend de Supabase.
-- El esquema private no está expuesto por la Data API.

grant usage on schema private to authenticated, service_role;

grant execute on function private.recalcular_resumen_bote(smallint)
  to authenticated, service_role;

grant execute on function private.sync_resumen_bote_trigger()
  to authenticated, service_role;
