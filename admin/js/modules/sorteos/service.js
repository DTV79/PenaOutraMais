import {
  adminSelect,
  adminInsert,
  adminUpdate,
  adminRpc,
  adminFunction
} from '../../services/admin-api.js?v=20261021-10';

export async function getDrawsSnapshot() {
  const [games, seasons] = await Promise.all([
    adminSelect('juegos?select=codigo,nombre,formato,config,activo&activo=eq.true&order=nombre.asc'),
    adminSelect('temporadas?select=id,anio,activa&activa=eq.true&limit=1')
  ]);

  const season = seasons[0] || null;
  if (!season) {
    return { season:null, games, draws:[], bets:[], programs:[] };
  }

  const [draws, programs] = await Promise.all([
    adminSelect(
      `sorteos?select=id,temporada_id,juego_codigo,fecha,nombre,estado,resultado,fuente_url,comprobado_at,error_comprobacion,automatico,movimiento_bote_id&temporada_id=eq.${season.id}&order=fecha.desc,id.desc`
    ),
    adminSelect(
      `programacion_juegos?select=id,temporada_id,juego_codigo,activa,dias_semana,importe_por_apuesta,observaciones&temporada_id=eq.${season.id}&order=id.asc`
    )
  ]);

  let bets = [];
  if (draws.length) {
    const ids = draws.map((row) => row.id).join(',');
    bets = await adminSelect(
      `apuestas?select=id,sorteo_id,origen_combinacion_id,tipo,descripcion,importe,datos,comprobada,categoria_premio,premio,detalle_resultado&sorteo_id=in.(${ids})&order=id.asc`
    );
  }

  return { season, games, draws, bets, programs };
}

export async function createFixedDraw({ date, amount }) {
  return adminRpc('crear_sorteo_fijas', {
    p_fecha: date,
    p_juego_codigo: 'primitiva',
    p_nombre: null,
    p_importe_por_apuesta: Number(amount || 0),
    p_reintegro: null,
    p_automatico: false
  });
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

export async function createSpecialBet({ season, gameCode, date, drawName, description, amount, data }) {
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
    datos: data
  });
}

export function saveProgram(programId, payload) {
  return adminUpdate(
    `programacion_juegos?id=eq.${encodeURIComponent(programId)}`,
    payload
  );
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
