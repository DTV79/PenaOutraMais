-- Correcciones históricas confirmadas el 22/10/2026.
-- Cuota anual: 52 € todos los años (1 €/semana x 52 semanas).
-- La columna gastos_salidas recoge cenas, salidas y ajustes que reducen el saldo
-- que pasa como arrastre al ejercicio siguiente.

begin;

update public.temporadas
set cuota_semanal = 1.00,
    numero_semanas = 52,
    updated_at = now()
where anio between 2012 and 2026;

update public.resumen_anual
set arrastre_inicial = 43.00,
    premios_ordinarios = 419.02,
    premios_extra = 0.00,
    gastos_salidas = 454.02,
    saldo_final = 8.00,
    observaciones = 'Cena de la peña en 2012: total acumulado 462,02 €; tras la cena quedaron 8,00 € para 2013',
    provisional = false,
    updated_at = now()
where anio = 2012;

update public.resumen_anual
set gastos_salidas = 330.00,
    saldo_final = 7.00,
    observaciones = 'Cena de la peña en 2013: del total acumulado de 337,00 € quedaron 7,00 € para 2014',
    updated_at = now()
where anio = 2013;

update public.resumen_anual
set arrastre_inicial = 7.00,
    premios_ordinarios = 198.00,
    premios_extra = 0.00,
    gastos_salidas = 159.00,
    saldo_final = 46.00,
    observaciones = 'Total histórico confirmado: 205,00 €. Salida/ajuste de 159,00 € inferida para enlazar con el arrastre de 46,00 € de 2015',
    provisional = true,
    updated_at = now()
where anio = 2014;

update public.resumen_anual
set arrastre_inicial = 567.25,
    premios_ordinarios = 351.53,
    premios_extra = 0.00,
    gastos_salidas = 908.78,
    saldo_final = 10.00,
    observaciones = 'Cena de la peña en 2017: total acumulado 918,78 €; tras la cena quedaron 10,00 € para 2018',
    provisional = false,
    updated_at = now()
where anio = 2017;

update public.resumen_anual
set arrastre_inicial = 10.00,
    premios_ordinarios = 223.00,
    premios_extra = 0.00,
    gastos_salidas = 0.00,
    saldo_final = 233.00,
    observaciones = 'Total histórico confirmado: 233,00 €',
    provisional = false,
    updated_at = now()
where anio = 2018;

commit;
