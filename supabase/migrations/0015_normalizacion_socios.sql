-- 0015_normalizacion_socios.sql
-- Normaliza DNI y teléfonos de socios tanto al crear como al editar.
-- DNI: 99999999x / 99999999-X / 99.999.999-X -> 99.999.999-X
-- Teléfono español: 666666666 / +34666666666 -> 666 66 66 66

create or replace function private.formatear_dni(p_dni text)
returns text
language plpgsql
immutable
strict
set search_path=''
as $$
declare
  v text;
begin
  v := upper(regexp_replace(p_dni, '[^0-9A-Za-z]', '', 'g'));

  if v ~ '^[0-9]{8}[A-Z]$' then
    return substr(v,1,2) || '.' ||
           substr(v,3,3) || '.' ||
           substr(v,6,3) || '-' ||
           substr(v,9,1);
  end if;

  return upper(trim(p_dni));
end;
$$;

create or replace function private.formatear_telefono(p_telefono text)
returns text
language plpgsql
immutable
strict
set search_path=''
as $$
declare
  v text;
begin
  v := regexp_replace(p_telefono, '[^0-9]', '', 'g');

  if length(v)=11 and left(v,2)='34' then
    v := substr(v,3);
  end if;

  if v ~ '^[0-9]{9}$' then
    return substr(v,1,3) || ' ' ||
           substr(v,4,2) || ' ' ||
           substr(v,6,2) || ' ' ||
           substr(v,8,2);
  end if;

  return trim(p_telefono);
end;
$$;

create or replace function private.socios_normalizar_contacto_trigger()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if new.dni is not null and btrim(new.dni) <> '' then
    new.dni := private.formatear_dni(new.dni);
  elsif new.dni is not null then
    new.dni := null;
  end if;

  if new.telefono is not null and btrim(new.telefono) <> '' then
    new.telefono := private.formatear_telefono(new.telefono);
  elsif new.telefono is not null then
    new.telefono := null;
  end if;

  return new;
end;
$$;

grant execute on function private.formatear_dni(text)
  to authenticated, service_role;
grant execute on function private.formatear_telefono(text)
  to authenticated, service_role;
grant execute on function private.socios_normalizar_contacto_trigger()
  to authenticated, service_role;

drop trigger if exists socios_normalizar_dni on public.socios;
drop trigger if exists socios_normalizar_contacto on public.socios;

create trigger socios_normalizar_contacto
before insert or update of dni,telefono on public.socios
for each row
execute function private.socios_normalizar_contacto_trigger();

update public.socios
set dni=dni,
    telefono=telefono
where dni is not null
   or telefono is not null;
