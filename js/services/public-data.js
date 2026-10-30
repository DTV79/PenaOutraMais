import { supabaseSelect } from './supabase.js?v=20261030-03';

export async function getPublicSnapshot() {
  const [season]=await supabaseSelect(
    'temporadas?select=id,anio,cuota_semanal,numero_semanas,cuota_anual,activa&activa=eq.true&limit=1'
  );

  if (!season) return null;

  const [
    fixedPlays,
    combinations,
    history,
    balanceRows,
    movements,
    games,
    programs,
    draws
  ]=await Promise.all([
    supabaseSelect(
      `jugadas_fijas?select=id,nombre,juego_codigo,activa&temporada_id=eq.${season.id}&activa=eq.true&order=id.asc`
    ),
    supabaseSelect(
      `combinaciones?select=id,jugada_fija_id,numero_orden,nombre,numeros,estrellas,juego_codigo&temporada_id=eq.${season.id}&activa=eq.true&order=jugada_fija_id.asc,numero_orden.asc`
    ),
    supabaseSelect(
      'resumen_anual?select=anio,arrastre_inicial,premios_ordinarios,gastos_salidas,premios_extra,saldo_final,observaciones,provisional&order=anio.desc'
    ),
    supabaseSelect(
      `resumen_anual?select=arrastre_inicial,premios_ordinarios,gastos_salidas,premios_extra,saldo_final&anio=eq.${season.anio}&limit=1`
    ),
    supabaseSelect(
      `movimientos_bote?select=id,fecha,mes,tipo,concepto,importe,observaciones&anio=eq.${season.anio}&order=fecha.desc.nullslast,id.desc`
    ),
    supabaseSelect(
      'juegos?select=codigo,nombre,formato&activo=eq.true&order=nombre.asc'
    ),
    supabaseSelect(
      `programacion_juegos?select=id,juego_codigo,nombre,dias_semana,importe_total,fuente_fondos,usar_combinaciones_fijas,jugada_fija_id,datos_apuesta&temporada_id=eq.${season.id}&activa=eq.true&order=id.asc`
    ),
    supabaseSelect(
      `sorteos?select=id,juego_codigo,fecha,nombre,estado,resultado,fuente_url,comprobado_at,automatico,programacion_id&temporada_id=eq.${season.id}&order=fecha.asc,id.asc`
    )
  ]);

  let bets=[];
  if (draws.length) {
    const ids=draws.map((draw)=>draw.id).join(',');
    bets=await supabaseSelect(
      `apuestas?select=id,sorteo_id,origen_combinacion_id,programacion_id,tipo,descripcion,importe,fuente_fondos,datos,comprobada,categoria_premio,premio,detalle_resultado&sorteo_id=in.(${ids})&order=id.asc`
    );
  }

  return {
    season,
    fixedPlays,
    combinations,
    history,
    currentBalance:balanceRows?.[0] ?? null,
    movements,
    games,
    programs,
    draws,
    bets
  };
}
