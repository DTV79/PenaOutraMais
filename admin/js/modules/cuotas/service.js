import { adminSelect, adminInsert, adminUpdate } from '../../services/admin-api.js';
import { getValidSession } from '../../services/auth.js';

export async function getQuotaSnapshot() {
  const [seasons, members, movements] = await Promise.all([
    adminSelect('temporadas?select=id,anio,cuota_anual,activa&activa=eq.true&limit=1'),
    adminSelect('socios?select=id,alias,fecha_baja&order=alias.asc'),
    adminSelect('movimientos_cuotas?select=id,socio_id,temporada_id,fecha,importe,tipo,metodo,observaciones,aplicar_anio,anulado_at,anulado_por&order=fecha.desc,id.desc')
  ]);

  const season = seasons[0] || null;

  if (!season) {
    return { season:null, members:[], movements:[], quotaPlaySpend:0 };
  }

  const draws = await adminSelect(
    `sorteos?select=id&temporada_id=eq.${season.id}`
  );

  let quotaPlaySpend = 0;
  if (draws.length) {
    const ids = draws.map((row)=>row.id).join(',');
    const bets = await adminSelect(
      `apuestas?select=importe,fuente_fondos&sorteo_id=in.(${ids})&fuente_fondos=eq.cuotas`
    );

    quotaPlaySpend = bets.reduce(
      (sum,bet)=>sum+Number(bet.importe || 0),
      0
    );
  }

  return {
    season,
    members: members.filter((member) => !member.fecha_baja),
    movements: movements.filter((movement) => movement.temporada_id === season.id),
    quotaPlaySpend
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
