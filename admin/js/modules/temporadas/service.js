import { adminSelect, adminRpc } from '../../services/admin-api.js?v=20261021-22';

export async function getSeasonsSnapshot() {
  const [seasons, summaries] = await Promise.all([
    adminSelect(
      'temporadas?select=id,anio,fecha_inicio,fecha_fin,cuota_semanal,numero_semanas,cuota_anual,activa,observaciones&order=anio.desc'
    ),
    adminSelect(
      'resumen_anual?select=anio,arrastre_inicial,premios_ordinarios,gastos_salidas,premios_extra,saldo_final,observaciones,provisional&order=anio.desc'
    )
  ]);

  const summaryByYear=new Map(summaries.map((row)=>[Number(row.anio),row]));

  return {
    seasons:seasons.map((season)=>({
      ...season,
      summary:summaryByYear.get(Number(season.anio)) || null
    }))
  };
}

export function createPreparedSeason(payload) {
  return adminRpc('crear_temporada_preparada', {
    p_anio:Number(payload.anio),
    p_fecha_inicio:payload.fecha_inicio,
    p_fecha_fin:payload.fecha_fin,
    p_cuota_semanal:Number(payload.cuota_semanal),
    p_numero_semanas:Number(payload.numero_semanas),
    p_copiar_combinaciones:Boolean(payload.copiar_combinaciones),
    p_copiar_programaciones:Boolean(payload.copiar_programaciones),
    p_observaciones:payload.observaciones || null
  });
}

export function activateSeason(id) {
  return adminRpc('activar_temporada', {
    p_temporada_id:Number(id)
  });
}
