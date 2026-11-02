import { adminSelect, adminInsert, adminUpdate } from '../../services/admin-api.js?v=20261021-22';
import { getValidSession } from '../../services/auth.js';

export async function getQuotaSnapshot() {
  const [seasons, members, movements] = await Promise.all([
    adminSelect(
      'temporadas?select=id,anio,fecha_inicio,fecha_fin,cuota_semanal,numero_semanas,cuota_anual,activa&activa=eq.true&limit=1'
    ),
    adminSelect('socios?select=id,alias,fecha_baja&order=alias.asc'),
    adminSelect('movimientos_cuotas?select=id,socio_id,temporada_id,fecha,importe,tipo,metodo,observaciones,aplicar_anio,anulado_at,anulado_por&order=fecha.desc,id.desc')
  ]);

  const season = seasons[0] || null;

  if (!season) {
    return {
      season:null,
      members:[],
      movements:[],
      allMovements:[],
      quotaSpent:0,
      quotaHistorical:0,
      quotaSealed:0,
      quotaUnsealed:0,
      fundsCollected:0,
      availableFunds:0
    };
  }

  const activeMembers=members.filter((member)=>!member.fecha_baja);
  const [summary]=await adminSelect(
    `resumen_cuotas_publico?select=cobrado,jugado_con_cuotas,gasto_historico,gasto_sellado,pendiente_sellar,disponible&temporada_id=eq.${season.id}&limit=1`
  );
  if (!summary) {
    throw new Error('No se ha podido consultar el resumen unificado de cuotas.');
  }

  return {
    season,
    members:activeMembers,
    movements:movements.filter((movement)=>movement.temporada_id===season.id),
    allMovements:movements,
    quotaSpent:Number(summary.jugado_con_cuotas || 0),
    quotaHistorical:Number(summary.gasto_historico || 0),
    quotaSealed:Number(summary.gasto_sellado || 0),
    quotaUnsealed:Number(summary.pendiente_sellar || 0),
    fundsCollected:Number(summary.cobrado || 0),
    availableFunds:Number(summary.disponible || 0)
  };
}

export function createQuotaMovement(payload) {
  return adminInsert('movimientos_cuotas', payload);
}

export function updateQuotaMovement(id, payload) {
  return adminUpdate(
    `movimientos_cuotas?id=eq.${encodeURIComponent(id)}`,
    payload
  );
}

export async function cancelQuotaMovement(id) {
  const session = await getValidSession();

  if (!session?.user?.id) {
    throw new Error('No se pudo identificar la sesión actual.');
  }

  return updateQuotaMovement(id, {
    anulado_at: new Date().toISOString(),
    anulado_por: session.user.id
  });
}
