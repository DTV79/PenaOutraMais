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
  constraint juegos_formato_valido check (
    formato in ('6_numeros','5_estrellas','decimo')
  )
);

create table public.combinaciones (
  id bigint generated always as identity primary key,
  temporada_id bigint not null references public.temporadas(id) on delete cascade,
  juego_codigo text not null default 'primitiva' references public.juegos(codigo) on delete restrict,
  numero_orden smallint not null,
  nombre text,
  numeros smallint[] not null,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint combinaciones_seis_numeros check (cardinality(numeros) = 6),
  constraint combinaciones_orden_valido check (numero_orden between 1 and 99),
  constraint combinaciones_numeros_rango check (
    numeros[1] between 1 and 49 and numeros[2] between 1 and 49 and
    numeros[3] between 1 and 49 and numeros[4] between 1 and 49 and
    numeros[5] between 1 and 49 and numeros[6] between 1 and 49
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
  constraint movimientos_cuotas_importe_no_cero check (importe <> 0),
  constraint movimientos_cuotas_tipo_valido check (
    tipo in ('pago','ajuste','devolucion','saldo_a_favor')
  ),
  constraint movimientos_cuotas_aplicar_anio_valido check (
    aplicar_anio is null or aplicar_anio between 2012 and 2100
  )
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
  updated_at timestamptz not null default now(),
  constraint movimientos_bote_anio_valido check (anio between 2000 and 2100),
  constraint movimientos_bote_mes_valido check (mes is null or mes between 1 and 12),
  constraint movimientos_bote_importe_no_cero check (importe <> 0),
  constraint movimientos_bote_tipo_valido check (
    tipo in ('arrastre','premio','gasto','premio_extra','reparto','ajuste')
  ),
  constraint movimientos_bote_signo_tipo check (
    (tipo in ('arrastre','premio','premio_extra') and importe > 0)
    or (tipo in ('gasto','reparto') and importe < 0)
    or (tipo='ajuste' and importe <> 0)
  )
);

create unique index movimientos_bote_arrastre_activo_unico
  on public.movimientos_bote(anio)
  where tipo='arrastre' and anulado_at is null;

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

-- Seguridad aplicada en Supabase:
-- socios y movimientos_cuotas: sin lectura pública.
-- temporadas, juegos, combinaciones, resumen_anual, movimientos_bote y sorteos comprobados:
-- lectura pública controlada por RLS.
-- apuestas y programacion_juegos: solo administradores.
