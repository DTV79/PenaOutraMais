import { adminSelect, adminInsert, adminUpdate } from '../../services/admin-api.js';

export async function getNumbersSnapshot() {
  const seasons = await adminSelect(
    'temporadas?select=id,anio,activa&activa=eq.true&limit=1'
  );

  const season = seasons[0] || null;

  if (!season) {
    return { season:null, combinations:[] };
  }

  const combinations = await adminSelect(
    `combinaciones?select=id,temporada_id,numero_orden,nombre,numeros,activa&temporada_id=eq.${season.id}&order=numero_orden.asc`
  );

  return { season, combinations };
}

export function createCombination(payload) {
  return adminInsert('combinaciones', payload);
}

export function updateCombination(id, payload) {
  return adminUpdate(
    `combinaciones?id=eq.${encodeURIComponent(id)}`,
    payload
  );
}

export function setCombinationActive(id, active) {
  return updateCombination(id, { activa: active });
}
