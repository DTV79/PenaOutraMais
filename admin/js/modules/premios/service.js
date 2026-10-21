import { adminSelect, adminInsert, adminUpdate, adminRpc } from '../../services/admin-api.js?v=20261021-22';
import { getValidSession } from '../../services/auth.js';

export async function getAwardsSnapshot() {
  const seasons = await adminSelect(
    'temporadas?select=id,anio,activa&activa=eq.true&limit=1'
  );
  const season = seasons[0] || null;

  if (!season) return { season:null, summary:null, movements:[] };

  const [summaryRows, movements] = await Promise.all([
    adminSelect(
      `resumen_anual?select=anio,arrastre_inicial,premios_ordinarios,gastos_salidas,premios_extra,saldo_final,observaciones,provisional&anio=eq.${season.anio}&limit=1`
    ),
    adminSelect(
      `movimientos_bote?select=id,temporada_id,fecha,anio,mes,tipo,concepto,importe,observaciones,anulado_at,anulado_por&anio=eq.${season.anio}&order=id.desc`
    )
  ]);

  return { season, summary: summaryRows[0] || null, movements };
}

export function createBoteMovement(payload) {
  return adminInsert('movimientos_bote', payload);
}

export function updateBoteMovement(id, payload) {
  return adminUpdate(
    `movimientos_bote?id=eq.${encodeURIComponent(id)}`,
    payload
  );
}

export async function cancelBoteMovement(id) {
  const session = await getValidSession();
  if (!session?.user?.id) throw new Error('No se pudo identificar la sesión actual.');

  return updateBoteMovement(id, {
    anulado_at: new Date().toISOString(),
    anulado_por: session.user.id
  });
}

export function deleteBoteMovement(id) {
  return adminRpc('eliminar_movimiento_bote', {
    p_movimiento_id: Number(id)
  });
}
