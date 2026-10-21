-- Premios históricos 2026 importados desde el Excel de la peña.
-- Criterio acordado: cuando no se conoce si el premio corresponde al jueves
-- o al sábado, se asigna al sábado de esa semana.
-- El campo mes conserva el mes de referencia del Excel para mantener
-- exactamente los mismos totales mensuales.

with premios(fecha,mes_ref,importe,mes_nombre) as (
  values
    ('2026-01-17'::date,1,  8.00::numeric,'Enero'),
    ('2026-01-24'::date,1, 13.00::numeric,'Enero'),

    ('2026-01-31'::date,2, 13.00::numeric,'Febrero'),
    ('2026-02-21'::date,2,  8.00::numeric,'Febrero'),

    ('2026-03-07'::date,3,  8.00::numeric,'Marzo'),
    ('2026-03-14'::date,3, 16.00::numeric,'Marzo'),
    ('2026-03-28'::date,3,  5.00::numeric,'Marzo'),

    ('2026-04-04'::date,4,  5.00::numeric,'Abril'),
    ('2026-04-18'::date,4,  5.00::numeric,'Abril'),
    ('2026-04-25'::date,4, 13.00::numeric,'Abril'),

    ('2026-05-02'::date,5,  8.00::numeric,'Mayo'),
    ('2026-05-16'::date,5, 13.00::numeric,'Mayo'),
    ('2026-05-30'::date,5,  8.00::numeric,'Mayo'),

    ('2026-06-06'::date,6,  5.00::numeric,'Junio'),

    ('2026-07-11'::date,7,  5.00::numeric,'Julio'),
    ('2026-07-18'::date,7,  5.00::numeric,'Julio'),
    ('2026-07-25'::date,7,  8.00::numeric,'Julio'),
    ('2026-08-01'::date,7, 18.00::numeric,'Julio'),

    ('2026-08-08'::date,8,  8.00::numeric,'Agosto'),
    ('2026-08-22'::date,8,  8.00::numeric,'Agosto'),

    ('2026-09-05'::date,9,  5.00::numeric,'Septiembre'),
    ('2026-09-19'::date,9, 13.00::numeric,'Septiembre'),

    ('2026-10-10'::date,10,52.27::numeric,'Octubre'),
    ('2026-10-17'::date,10,10.00::numeric,'Octubre')
),
temporada as (
  select id
  from public.temporadas
  where activa=true and anio=2026
  limit 1
)
insert into public.movimientos_bote(
  temporada_id,fecha,anio,mes,tipo,concepto,importe,observaciones
)
select
  t.id,
  p.fecha,
  2026,
  p.mes_ref,
  'premio',
  'Premio La Primitiva programada',
  p.importe,
  'Histórico importado desde Excel 2026 · Mes de referencia: ' ||
    p.mes_nombre ||
    ' · Fecha asignada al sábado de la semana'
from premios p
cross join temporada t
where not exists (
  select 1
  from public.movimientos_bote m
  where m.anio=2026
    and m.tipo='premio'
    and m.fecha=p.fecha
    and m.importe=p.importe
    and m.concepto='Premio La Primitiva programada'
);
