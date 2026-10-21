import { adminSelect } from '../../services/admin-api.js';

export async function getQuotaSnapshot() {
  const [seasons, members, movements] = await Promise.all([
    adminSelect('temporadas?select=id,anio,cuota_anual,activa&activa=eq.true&limit=1'),
    adminSelect('socios?select=id,alias,fecha_baja&order=alias.asc'),
    adminSelect('movimientos_cuotas?select=id,socio_id,temporada_id,fecha,importe,tipo,metodo,observaciones&order=fecha.desc,id.desc')
  ]);

  const season = seasons[0] || null;
  if (!season) {
    return { season:null, members:[], movements:[] };
  }

  return {
    season,
    members: members.filter((member) => !member.fecha_baja),
    movements: movements.filter((movement) => movement.temporada_id === season.id)
  };
}
