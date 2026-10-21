-- 0009_combinaciones_primitiva_rango.sql
-- Las combinaciones fijas actuales corresponden a La Primitiva.

alter table public.combinaciones
  drop constraint if exists combinaciones_numeros_rango;

alter table public.combinaciones
  add constraint combinaciones_numeros_rango
  check (
    numeros[1] between 1 and 49 and numeros[2] between 1 and 49 and
    numeros[3] between 1 and 49 and numeros[4] between 1 and 49 and
    numeros[5] between 1 and 49 and numeros[6] between 1 and 49
  );
