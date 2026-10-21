-- 0008_sorteos_y_apuestas.sql
-- Juegos múltiples, sorteos, apuestas fijas/especiales y automatización SELAE.
-- Requiere que la Edge Function supabase/functions/comprobar-sorteos-selae/index.ts
-- esté desplegada con el nombre "comprobar-sorteos-selae".

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create table public.juegos (
  codigo text primary key,
  nombre text not null,
  selae_game_id text,
  selae_path text,
  formato text not null,
  config jsonb not null default '{}'::jsonb,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint juegos_formato_valido check (formato in ('6_numeros','5_estrellas','decimo'))
);

insert into public.juegos (codigo,nombre,selae_game_id,selae_path,formato,config,activo)
values
  ('primitiva','La Primitiva','LAPR','primitiva','6_numeros',
    '{"cantidad_numeros":6,"min_numero":1,"max_numero":49,"reintegro":true}'::jsonb,true),
  ('euromillones','Euromillones','EMIL','euromillones','5_estrellas',
    '{"cantidad_numeros":5,"min_numero":1,"max_numero":50,"cantidad_estrellas":2,"min_estrella":1,"max_estrella":12}'::jsonb,true),
  ('bonoloto','Bonoloto','BONO','bonoloto','6_numeros',
    '{"cantidad_numeros":6,"min_numero":1,"max_numero":49,"reintegro":true}'::jsonb,true),
  ('loteria_nacional','Lotería Nacional','LNAC','lnac','decimo',
    '{"digitos":5,"serie_opcional":true,"fraccion_opcional":true}'::jsonb,true)
on conflict (codigo) do update set
  nombre=excluded.nombre,
  selae_game_id=excluded.selae_game_id,
  selae_path=excluded.selae_path,
  formato=excluded.formato,
  config=excluded.config,
  activo=excluded.activo;

alter table public.combinaciones
  add column juego_codigo text references public.juegos(codigo) on delete restrict;

update public.combinaciones set juego_codigo='primitiva' where juego_codigo is null;

alter table public.combinaciones
  alter column juego_codigo set default 'primitiva',
  alter column juego_codigo set not null;

create table public.sorteos (
  id bigint generated always as identity primary key,
  temporada_id bigint references public.temporadas(id) on delete set null,
  juego_codigo text not null references public.juegos(codigo) on delete restrict,
  fecha date not null,
  nombre text,
  estado text not null default 'pendiente',
  resultado jsonb,
  fuente_url text,
  comprobado_at timestamptz,
  error_comprobacion text,
  automatico boolean not null default false,
  movimiento_bote_id bigint references public.movimientos_bote(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sorteos_estado_valido check (
    estado in ('pendiente','comprobado','sin_resultado','error')
  )
);

create unique index sorteos_juego_fecha_nombre_unico
  on public.sorteos(juego_codigo,fecha,coalesce(nombre,''));

create table public.apuestas (
  id bigint generated always as identity primary key,
  sorteo_id bigint not null references public.sorteos(id) on delete cascade,
  origen_combinacion_id bigint references public.combinaciones(id) on delete set null,
  tipo text not null default 'especial',
  descripcion text,
  importe numeric(10,2) not null default 0,
  datos jsonb not null,
  comprobada boolean not null default false,
  categoria_premio text,
  premio numeric(12,2) not null default 0,
  detalle_resultado jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint apuestas_tipo_valido check (tipo in ('fija','especial')),
  constraint apuestas_importe_valido check (importe >= 0),
  constraint apuestas_premio_valido check (premio >= 0),
  constraint apuestas_datos_objeto check (jsonb_typeof(datos)='object')
);

create unique index apuestas_fijas_sorteo_combinacion_unico
  on public.apuestas(sorteo_id,origen_combinacion_id)
  where origen_combinacion_id is not null;

create table public.programacion_juegos (
  id bigint generated always as identity primary key,
  temporada_id bigint not null references public.temporadas(id) on delete cascade,
  juego_codigo text not null references public.juegos(codigo) on delete restrict,
  activa boolean not null default false,
  dias_semana smallint[] not null default '{}'::smallint[],
  importe_por_apuesta numeric(10,2) not null default 0,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programacion_dias_validos check (
    dias_semana <@ array[1,2,3,4,5,6,7]::smallint[]
  ),
  constraint programacion_importe_valido check (importe_por_apuesta >= 0),
  unique (temporada_id,juego_codigo)
);

create trigger juegos_set_updated_at
before update on public.juegos
for each row execute function private.set_updated_at();

create trigger sorteos_set_updated_at
before update on public.sorteos
for each row execute function private.set_updated_at();

create trigger apuestas_set_updated_at
before update on public.apuestas
for each row execute function private.set_updated_at();

create trigger programacion_juegos_set_updated_at
before update on public.programacion_juegos
for each row execute function private.set_updated_at();

alter table public.juegos enable row level security;
alter table public.sorteos enable row level security;
alter table public.apuestas enable row level security;
alter table public.programacion_juegos enable row level security;

grant select on public.juegos to anon,authenticated;
grant select on public.sorteos to anon,authenticated;
grant select,insert,update,delete on public.juegos to authenticated;
grant select,insert,update,delete on public.sorteos to authenticated;
grant select,insert,update,delete on public.apuestas to authenticated;
grant select,insert,update,delete on public.programacion_juegos to authenticated;
grant usage,select on all sequences in schema public to authenticated;

create policy juegos_public_read on public.juegos
for select to anon,authenticated using (activo=true);

create policy juegos_admin_all on public.juegos
for all to authenticated
using (
  exists(select 1 from public.administradores a
    where a.user_id=(select auth.uid()) and a.activo=true)
)
with check (
  exists(select 1 from public.administradores a
    where a.user_id=(select auth.uid()) and a.activo=true)
);

create policy sorteos_public_read on public.sorteos
for select to anon,authenticated using (estado='comprobado');

create policy sorteos_admin_all on public.sorteos
for all to authenticated
using (
  exists(select 1 from public.administradores a
    where a.user_id=(select auth.uid()) and a.activo=true)
)
with check (
  exists(select 1 from public.administradores a
    where a.user_id=(select auth.uid()) and a.activo=true)
);

create policy apuestas_admin_all on public.apuestas
for all to authenticated
using (
  exists(select 1 from public.administradores a
    where a.user_id=(select auth.uid()) and a.activo=true)
)
with check (
  exists(select 1 from public.administradores a
    where a.user_id=(select auth.uid()) and a.activo=true)
);

create policy programacion_juegos_admin_all on public.programacion_juegos
for all to authenticated
using (
  exists(select 1 from public.administradores a
    where a.user_id=(select auth.uid()) and a.activo=true)
)
with check (
  exists(select 1 from public.administradores a
    where a.user_id=(select auth.uid()) and a.activo=true)
);

insert into public.programacion_juegos(
  temporada_id,juego_codigo,activa,dias_semana,importe_por_apuesta,observaciones
)
select id,'primitiva',false,'{}'::smallint[],0,
  'Configura aquí los días habituales de La Primitiva que juega la peña'
from public.temporadas
where activa=true
on conflict (temporada_id,juego_codigo) do nothing;

create or replace function public.crear_sorteo_fijas(
  p_fecha date,
  p_juego_codigo text default 'primitiva',
  p_nombre text default null,
  p_importe_por_apuesta numeric default 0,
  p_reintegro smallint default null,
  p_automatico boolean default false
)
returns bigint
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_temporada_id bigint;
  v_sorteo_id bigint;
begin
  if p_reintegro is not null and (p_reintegro < 0 or p_reintegro > 9) then
    raise exception 'Reintegro inválido';
  end if;

  select id into v_temporada_id
  from public.temporadas
  where activa=true
  limit 1;

  if v_temporada_id is null then
    raise exception 'No hay temporada activa';
  end if;

  insert into public.sorteos(temporada_id,juego_codigo,fecha,nombre,estado,automatico)
  values(v_temporada_id,p_juego_codigo,p_fecha,nullif(trim(p_nombre),''),
    'pendiente',p_automatico)
  on conflict (juego_codigo,fecha,(coalesce(nombre,'')))
  do update set updated_at=now()
  returning id into v_sorteo_id;

  insert into public.apuestas(
    sorteo_id,origen_combinacion_id,tipo,descripcion,importe,datos
  )
  select
    v_sorteo_id,c.id,'fija',coalesce(c.nombre,'Combinación '||c.numero_orden),
    p_importe_por_apuesta,
    jsonb_build_object('numeros',to_jsonb(c.numeros),'reintegro',p_reintegro)
  from public.combinaciones c
  where c.temporada_id=v_temporada_id
    and c.juego_codigo=p_juego_codigo
    and c.activa=true
  on conflict (sorteo_id,origen_combinacion_id) do update
    set importe=excluded.importe,
        datos=jsonb_set(public.apuestas.datos,'{reintegro}',
          coalesce(to_jsonb(p_reintegro),'null'::jsonb),true),
        updated_at=now();

  return v_sorteo_id;
end;
$$;

revoke all on function public.crear_sorteo_fijas(date,text,text,numeric,smallint,boolean)
  from public,anon;
grant execute on function public.crear_sorteo_fijas(date,text,text,numeric,smallint,boolean)
  to authenticated;

create or replace function private.generar_sorteos_programados(p_fecha date default current_date)
returns integer
language plpgsql
security invoker
set search_path=''
as $$
declare
  r record;
  v_count integer := 0;
  v_sorteo_id bigint;
begin
  for r in
    select p.*
    from public.programacion_juegos p
    join public.temporadas t on t.id=p.temporada_id
    where p.activa=true
      and t.activa=true
      and extract(isodow from p_fecha)::smallint=any(p.dias_semana)
  loop
    insert into public.sorteos(temporada_id,juego_codigo,fecha,nombre,estado,automatico)
    values(r.temporada_id,r.juego_codigo,p_fecha,null,'pendiente',true)
    on conflict (juego_codigo,fecha,(coalesce(nombre,'')))
    do update set updated_at=now()
    returning id into v_sorteo_id;

    insert into public.apuestas(
      sorteo_id,origen_combinacion_id,tipo,descripcion,importe,datos
    )
    select
      v_sorteo_id,c.id,'fija',coalesce(c.nombre,'Combinación '||c.numero_orden),
      r.importe_por_apuesta,
      jsonb_build_object('numeros',to_jsonb(c.numeros),'reintegro',null)
    from public.combinaciones c
    where c.temporada_id=r.temporada_id
      and c.juego_codigo=r.juego_codigo
      and c.activa=true
    on conflict (sorteo_id,origen_combinacion_id) do nothing;

    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$$;

revoke all on function private.generar_sorteos_programados(date)
  from public,anon,authenticated;

select cron.schedule(
  'pena-generar-sorteos-habituales',
  '10 0 * * *',
  $$select private.generar_sorteos_programados(current_date);$$
);

select cron.schedule(
  'pena-comprobar-sorteos-selae',
  '20 * * * *',
  $cron$
  select net.http_post(
    url := 'https://djrmbdbtfsgzwwcsatll.supabase.co/functions/v1/comprobar-sorteos-selae',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','sb_publishable_aZW9m8Xf4N-B6sC3ubATBQ_A7mUOiM0',
      'Authorization','Bearer sb_publishable_aZW9m8Xf4N-B6sC3ubATBQ_A7mUOiM0'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$
);
