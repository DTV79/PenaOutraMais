import {
  adminSelect,
  adminInsert,
  adminUpdate,
  adminRpc,
  adminFunction
} from '../../services/admin-api.js?v=20261021-22';

export async function getDrawsSnapshot() {
  const [games, seasons] = await Promise.all([
    adminSelect('juegos?select=codigo,nombre,formato,config,activo&activo=eq.true&order=nombre.asc'),
    adminSelect('temporadas?select=id,anio,activa&activa=eq.true&limit=1')
  ]);

  const season = seasons[0] || null;
  if (!season) {
    return {
      season:null,
      games,
      draws:[],
      bets:[],
      programs:[],
      fixedCombinations:[],
      fixedCombinationCount:0
    };
  }

  const [draws, programs, fixedCombinations] = await Promise.all([
    adminSelect(
      `sorteos?select=id,temporada_id,juego_codigo,fecha,nombre,estado,resultado,fuente_url,comprobado_at,error_comprobacion,automatico,movimiento_bote_id,movimiento_gasto_bote_id,programacion_id&temporada_id=eq.${season.id}&order=fecha.desc,id.desc`
    ),
    adminSelect(
      `programacion_juegos?select=id,temporada_id,juego_codigo,nombre,activa,dias_semana,importe_por_apuesta,importe_total,fuente_fondos,usar_combinaciones_fijas,datos_apuesta,observaciones&temporada_id=eq.${season.id}&order=id.asc`
    ),
    adminSelect(
      `combinaciones?select=id,numero_orden,nombre&temporada_id=eq.${season.id}&juego_codigo=eq.primitiva&activa=eq.true&order=numero_orden.asc`
    )
  ]);

  let bets = [];
  if (draws.length) {
    const ids = draws.map((row) => row.id).join(',');
    bets = await adminSelect(
      `apuestas?select=id,sorteo_id,origen_combinacion_id,programacion_id,tipo,descripcion,importe,fuente_fondos,datos,comprobada,categoria_premio,premio,detalle_resultado&sorteo_id=in.(${ids})&order=id.asc`
    );
  }

  return {
    season,
    games,
    draws,
    bets,
    programs,
    fixedCombinations,
    fixedCombinationCount: fixedCombinations.length
  };
}

async function findDraw(gameCode, date, name, seasonId) {
  let path =
    `sorteos?select=id&temporada_id=eq.${seasonId}&juego_codigo=eq.${encodeURIComponent(gameCode)}&fecha=eq.${date}`;

  if (name) {
    path += `&nombre=eq.${encodeURIComponent(name)}`;
  } else {
    path += '&nombre=is.null';
  }

  const rows = await adminSelect(path + '&limit=1');
  return rows[0] || null;
}

export async function createSpecialBet({
  season,
  gameCode,
  date,
  drawName,
  description,
  amount,
  fundingSource,
  data
}) {
  let draw = await findDraw(gameCode, date, drawName, season.id);

  if (!draw) {
    const rows = await adminInsert('sorteos', {
      temporada_id: season.id,
      juego_codigo: gameCode,
      fecha: date,
      nombre: drawName || null,
      estado: 'pendiente',
      automatico: false
    });
    draw = rows[0];
  }

  return adminInsert('apuestas', {
    sorteo_id: draw.id,
    tipo: 'especial',
    descripcion: description || null,
    importe: Number(amount || 0),
    fuente_fondos: fundingSource || 'bote',
    datos: data
  });
}

function normalizeProgramPayload(payload, fixedCombinationCount) {
  const useFixed = Boolean(payload.usar_combinaciones_fijas);
  const total = Number(payload.importe_total || 0);
  const count = Number(fixedCombinationCount || 0);

  return {
    temporada_id: Number(payload.temporada_id),
    juego_codigo: payload.juego_codigo,
    nombre: payload.nombre,
    activa: Boolean(payload.activa),
    dias_semana: payload.dias_semana,
    importe_total: total,
    importe_por_apuesta: useFixed && count
      ? Number((total / count).toFixed(2))
      : total,
    fuente_fondos: payload.fuente_fondos || 'cuotas',
    usar_combinaciones_fijas: useFixed,
    datos_apuesta: payload.datos_apuesta || {},
    observaciones: payload.observaciones || null
  };
}

export function createProgram(payload, fixedCombinationCount) {
  return adminInsert(
    'programacion_juegos',
    normalizeProgramPayload(payload, fixedCombinationCount)
  );
}

export function updateProgram(programId, payload, fixedCombinationCount) {
  const normalized = normalizeProgramPayload(payload, fixedCombinationCount);
  delete normalized.temporada_id;

  return adminUpdate(
    `programacion_juegos?id=eq.${encodeURIComponent(programId)}`,
    normalized
  );
}

export function setProgramActive(programId, active) {
  return adminUpdate(
    `programacion_juegos?id=eq.${encodeURIComponent(programId)}`,
    { activa:Boolean(active) }
  );
}

export function refreshScheduledDraws() {
  return adminRpc('refrescar_sorteos_programados', {});
}

export function checkDraw(drawId) {
  return adminFunction('comprobar-sorteos-selae', { sorteo_id: Number(drawId) });
}

export async function updateDrawRefund(drawId, bets, refunds) {
  const fixedBets = bets.filter(
    (bet) => Number(bet.sorteo_id) === Number(drawId) && bet.tipo === 'fija'
  );

  if (!fixedBets.length) {
    throw new Error('Este sorteo no tiene combinaciones fijas.');
  }

  await Promise.all(
    fixedBets.map((bet) => {
      const value = refunds[String(bet.id)];
      return adminUpdate(
        `apuestas?id=eq.${encodeURIComponent(bet.id)}`,
        {
          datos: {
            ...(bet.datos || {}),
            reintegro: value === '' || value === null ? null : Number(value)
          },
          comprobada: false,
          categoria_premio: null,
          premio: 0,
          detalle_resultado: null
        }
      );
    })
  );

  return fixedBets.length;
}

export function deleteDraw(drawId) {
  return adminRpc('eliminar_sorteo', {
    p_sorteo_id: Number(drawId)
  });
}
