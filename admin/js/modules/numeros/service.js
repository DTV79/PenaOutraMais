import {
  adminSelect,
  adminInsert,
  adminUpdate,
  adminRpc
} from '../../services/admin-api.js?v=20261021-22';

export async function getNumbersSnapshot() {
  const [seasons, games] = await Promise.all([
    adminSelect('temporadas?select=id,anio,activa&activa=eq.true&limit=1'),
    adminSelect('juegos?select=codigo,nombre,formato,config,activo&activo=eq.true&order=nombre.asc')
  ]);

  const season = seasons[0] || null;

  if (!season) {
    return { season:null, games, fixedPlays:[], combinations:[] };
  }

  const [fixedPlays, combinations] = await Promise.all([
    adminSelect(
      `jugadas_fijas?select=id,temporada_id,nombre,juego_codigo,activa,observaciones&temporada_id=eq.${season.id}&order=id.asc`
    ),
    adminSelect(
      `combinaciones?select=id,temporada_id,jugada_fija_id,numero_orden,nombre,numeros,estrellas,activa,juego_codigo&temporada_id=eq.${season.id}&order=jugada_fija_id.asc,numero_orden.asc`
    )
  ]);

  return { season, games, fixedPlays, combinations };
}

export function createFixedPlay(payload) {
  return adminInsert('jugadas_fijas', payload);
}

export function updateFixedPlay(id, payload) {
  return adminUpdate(
    `jugadas_fijas?id=eq.${encodeURIComponent(id)}`,
    payload
  );
}

export function setFixedPlayActive(id, active) {
  return updateFixedPlay(id, { activa:Boolean(active) });
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
  return updateCombination(id, { activa:Boolean(active) });
}

export function refreshScheduledDraws() {
  return adminRpc('refrescar_sorteos_programados', {});
}
