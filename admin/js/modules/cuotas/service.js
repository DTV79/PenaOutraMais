import { adminSelect, adminInsert, adminUpdate } from '../../services/admin-api.js?v=20261021-22';
import { getValidSession } from '../../services/auth.js';

function elapsedSeasonWeeks(season) {
  if (!season?.fecha_inicio || !season?.fecha_fin) return 0;

  const start=new Date(`${season.fecha_inicio}T00:00:00`);
  const end=new Date(`${season.fecha_fin}T23:59:59`);
  const now=new Date();

  if (now<start) return 0;

  const effectiveDate=now>end ? end : now;
  const maxWeeks=Number(season.numero_semanas || 52);

  return Math.min(
    maxWeeks,
    Math.max(0,Math.ceil((effectiveDate-start+86400000)/604800000))
  );
}

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
      elapsedWeeks:0
    };
  }

  const activeMembers=members.filter((member)=>!member.fecha_baja);
  const elapsedWeeks=elapsedSeasonWeeks(season);
  const quotaSpent=
    elapsedWeeks *
    Number(season.cuota_semanal || 0) *
    activeMembers.length;

  return {
    season,
    members:activeMembers,
    movements:movements.filter((movement)=>movement.temporada_id===season.id),
    allMovements:movements,
    quotaSpent,
    elapsedWeeks
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
