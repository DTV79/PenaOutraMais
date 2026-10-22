-- 0022_preservar_reintegros_sorteos_programados.sql
-- Evita que refrescar las programaciones borre datos manuales del resguardo
-- (reintegro en La Primitiva y codigo_millon en Euromillones).

do $$
declare
  v_sql text;
begin
  select pg_get_functiondef(p.oid)
    into v_sql
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private'
    and p.proname='generar_sorteos_programados'
  limit 1;

  if v_sql is null then
    raise exception 'No se encontró private.generar_sorteos_programados';
  end if;

  if position(
    'datos=excluded.datos || jsonb_strip_nulls(jsonb_build_object(' in v_sql
  )=0 then
    v_sql := replace(
      v_sql,
      'datos=excluded.datos,',
      'datos=excluded.datos || jsonb_strip_nulls(jsonb_build_object(''reintegro'', apuestas.datos->''reintegro'', ''codigo_millon'', apuestas.datos->''codigo_millon'')),'
    );

    execute v_sql;
  end if;
end $$;
