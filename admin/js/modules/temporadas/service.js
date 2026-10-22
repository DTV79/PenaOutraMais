import { adminSelect, adminRpc } from '../../services/admin-api.js?v=20261021-22';

export async function getSeasonsSnapshot() {
  const [seasons, summaries, fixedPlays, combinations, programs] = await Promise.all([
    adminSelect(
      'temporadas?select=id,anio,fecha_inicio,fecha_fin,cuota_semanal,numero_semanas,cuota_anual,activa,observaciones&order=anio.desc'
    ),
    adminSelect(
      'resumen_anual?select=anio,arrastre_inicial,premios_ordinarios,gastos_salidas,premios_extra,saldo_final,observaciones,provisional&order=anio.desc'
    ),
    adminSelect(
      'jugadas_fijas?select=id,temporada_id,activa&order=id.asc'
    ),
    adminSelect(
      'combinaciones?select=id,temporada_id,jugada_fija_id,activa&order=id.asc'
    ),
    adminSelect(
      'programacion_juegos?select=id,temporada_id,activa&order=id.asc'
    )
  ]);

  const summaryByYear=new Map(summaries.map((row)=>[Number(row.anio),row]));

  return {
    seasons:seasons.map((season)=>{
      const seasonId=String(season.id);
      const seasonFixedPlays=fixedPlays.filter(
        (row)=>String(row.temporada_id)===seasonId
      );
      const seasonPlayIds=new Set(seasonFixedPlays.map((row)=>String(row.id)));
      const seasonCombinations=combinations.filter(
        (row)=>String(row.temporada_id)===seasonId &&
          seasonPlayIds.has(String(row.jugada_fija_id))
      );
      const seasonPrograms=programs.filter(
        (row)=>String(row.temporada_id)===seasonId
      );

      return {
        ...season,
        summary:summaryByYear.get(Number(season.anio)) || null,
        preparedStats:{
          fixedPlays:seasonFixedPlays.filter((row)=>row.activa).length,
          combinations:seasonCombinations.filter((row)=>row.activa).length,
          programs:seasonPrograms.filter((row)=>row.activa).length
        }
      };
    })
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
