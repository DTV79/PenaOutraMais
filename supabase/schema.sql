-- Peña Outra Máis · esquema inicial documentado
-- Proyecto Supabase: djrmbdbtfsgzwwcsatll
-- La base real ya tiene RLS y datos iniciales aplicados.

create table public.socios (
  id uuid primary key default gen_random_uuid(),
  nombre text,
  apellidos text,
  dni text,
  alias text not null,
  telefono text,
  email text,
  fecha_alta date,
  fecha_baja date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint socios_fecha_baja_valida check (fecha_baja is null or fecha_baja >= fecha_alta)
);

create table public.temporadas (
  id bigint generated always as identity primary key,
  anio smallint not null unique,
  fecha_inicio date not null,
  fecha_fin date not null,
  cuota_semanal numeric(8,2) not null default 1.00,
  numero_semanas smallint not null default 52,
  cuota_anual numeric(10,2) generated always as (cuota_semanal * numero_semanas) stored,
  activa boolean not null default false,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.combinaciones (
  id bigint generated always as identity primary key,
  temporada_id bigint not null references public.temporadas(id) on delete cascade,
  numero_orden smallint not null,
  nombre text,
  numeros smallint[] not null,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint combinaciones_seis_numeros check (cardinality(numeros) = 6),
  constraint combinaciones_orden_valido check (numero_orden between 1 and 99),
  constraint combinaciones_numeros_rango check (
    numeros[1] between 1 and 99 and numeros[2] between 1 and 99 and
    numeros[3] between 1 and 99 and numeros[4] between 1 and 99 and
    numeros[5] between 1 and 99 and numeros[6] between 1 and 99
  ),
  unique (temporada_id, numero_orden)
);

create table public.resumen_anual (
  id bigint generated always as identity primary key,
  anio smallint not null unique,
  arrastre_inicial numeric(12,2) not null default 0,
  premios_ordinarios numeric(12,2) not null default 0,
  gastos_salidas numeric(12,2) not null default 0,
  premios_extra numeric(12,2) not null default 0,
  saldo_final numeric(12,2) not null default 0,
  observaciones text,
  provisional boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.movimientos_cuotas (
  id bigint generated always as identity primary key,
  socio_id uuid not null references public.socios(id) on delete restrict,
  temporada_id bigint not null references public.temporadas(id) on delete restrict,
  fecha date not null,
  importe numeric(10,2) not null,
  tipo text not null default 'pago',
  metodo text,
  observaciones text,
  aplicar_anio integer,
  anulado_at timestamptz,
  anulado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint movimientos_bote_signo_tipo check (
    (tipo in ('arrastre','premio','premio_extra') and importe > 0)
    or (tipo in ('gasto','reparto') and importe < 0)
    or (tipo='ajuste' and importe <> 0)
  )
  updated_at timestamptz not null default now()
);

create table public.movimientos_bote (
  id bigint generated always as identity primary key,
  temporada_id bigint references public.temporadas(id) on delete restrict,
  fecha date,
  anio smallint not null,
  mes smallint,
  tipo text not null,
  concepto text not null,
  importe numeric(12,2) not null,
  observaciones text,
  anulado_at timestamptz,
  anulado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
);

create unique index movimientos_bote_arrastre_activo_unico
  on public.movimientos_bote(anio)
  where tipo='arrastre' and anulado_at is null;

-- Seguridad aplicada en Supabase:
-- socios y movimientos_cuotas: sin lectura pública.
-- temporadas, combinaciones, resumen_anual y movimientos_bote: lectura pública controlada por RLS.
