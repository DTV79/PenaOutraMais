import { supabaseSelect } from './supabase.js';

export async function getPublicSnapshot() {
  const [season] = await supabaseSelect(
    'temporadas?select=id,anio,cuota_semanal,numero_semanas,cuota_anual,activa&activa=eq.true&limit=1'
  );

  if (!season) {
    return null;
  }

  const [combinations, history, balanceRows, movements] = await Promise.all([
    supabaseSelect(
      `combinaciones?select=numero_orden,nombre,numeros&temporada_id=eq.${season.id}&activa=eq.true&order=numero_orden.asc`
    ),
    supabaseSelect(
      'resumen_anual?select=anio,arrastre_inicial,premios_ordinarios,gastos_salidas,premios_extra,saldo_final,observaciones,provisional&order=anio.desc'
    ),
    supabaseSelect(
      `resumen_anual?select=arrastre_inicial,premios_ordinarios,gastos_salidas,premios_extra,saldo_final&anio=eq.${season.anio}&limit=1`
    ),
    supabaseSelect(
      `movimientos_bote?select=mes,tipo,concepto,importe&anio=eq.${season.anio}&order=mes.asc.nullsfirst,id.asc`
    )
  ]);

  return {
    season,
    combinations,
    history,
    currentBalance: balanceRows?.[0] ?? null,
    movements
  };
}
