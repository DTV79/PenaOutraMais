import {
  adminSelect,
  adminInsert,
  adminUpdate,
  adminRpc,
  adminFunction
} from '../../services/admin-api.js?v=20261021-22';

export async function getDrawsSnapshot() {
  const [games,seasons]=await Promise.all([
    adminSelect('juegos?select=codigo,nombre,formato,config,activo&activo=eq.true&order=nombre.asc'),
    adminSelect('temporadas?select=id,anio,activa&activa=eq.true&limit=1')
  ]);

  const season=seasons[0] || null;
  if (!season) {
    return {
      season:null,games,draws:[],bets:[],programs:[],
      fixedPlays:[],fixedCombinations:[],prizeMovements:[],potBalance:0
    };
  }

  const [draws,programs,fixedPlays,fixedCombinations,prizeMovements,balanceRows]=await Promise.all([
    adminSelect(
      `sorteos?select=id,temporada_id,juego_codigo,fecha,nombre,estado,resultado,fuente_url,comprobado_at,error_comprobacion,automatico,movimiento_bote_id,movimiento_gasto_bote_id,programacion_id&temporada_id=eq.${season.id}&order=fecha.desc,id.desc`
    ),
    adminSelect(
      `programacion_juegos?select=id,temporada_id,juego_codigo,nombre,activa,dias_semana,importe_por_apuesta,importe_total,fuente_fondos,usar_combinaciones_fijas,jugada_fija_id,datos_apuesta,observaciones&temporada_id=eq.${season.id}&order=id.asc`
    ),
    adminSelect(
      `jugadas_fijas?select=id,temporada_id,nombre,juego_codigo,activa,observaciones&temporada_id=eq.${season.id}&order=id.asc`
    ),
    adminSelect(
      `combinaciones?select=id,jugada_fija_id,numero_orden,nombre,numeros,estrellas,activa,juego_codigo&temporada_id=eq.${season.id}&order=jugada_fija_id.asc,numero_orden.asc`
    ),
    adminSelect(
      `movimientos_bote?select=id,fecha,tipo,concepto,importe,anulado_at&tipo=eq.premio&fecha=gte.${season.anio}-01-01&fecha=lte.${season.anio}-12-31&anulado_at=is.null&order=fecha.desc,id.desc`
    ),
    adminSelect(
      `resumen_anual?select=saldo_final&anio=eq.${season.anio}&limit=1`
    )
  ]);

  let bets=[];
  if (draws.length) {
    const ids=draws.map((row)=>row.id).join(',');
    bets=await adminSelect(
      `apuestas?select=id,sorteo_id,origen_combinacion_id,programacion_id,tipo,descripcion,importe,fuente_fondos,datos,comprobada,categoria_premio,premio,detalle_resultado&sorteo_id=in.(${ids})&order=id.asc`
    );
  }

  return {
    season,games,draws,bets,programs,fixedPlays,fixedCombinations,
    prizeMovements,
    potBalance:Number(balanceRows?.[0]?.saldo_final || 0)
  };
}

async function findDraw(gameCode,date,name,seasonId) {
  let path=
    `sorteos?select=id&temporada_id=eq.${seasonId}&juego_codigo=eq.${encodeURIComponent(gameCode)}&fecha=eq.${date}`;

  if (name) path += `&nombre=eq.${encodeURIComponent(name)}`;
  else path += '&nombre=is.null';

  const rows=await adminSelect(path+'&limit=1');
  return rows[0] || null;
}

export async function createSpecialBet({
  season,gameCode,date,drawName,description,amount,fundingSource,data
}) {
  let draw=await findDraw(gameCode,date,drawName,season.id);

  if (!draw) {
    const rows=await adminInsert('sorteos',{
      temporada_id:season.id,
      juego_codigo:gameCode,
      fecha:date,
      nombre:drawName || null,
      estado:'pendiente',
      automatico:false
    });
    draw=rows[0];
  }

  return adminInsert('apuestas',{
    sorteo_id:draw.id,
    tipo:'especial',
    descripcion:description || null,
    importe:Number(amount || 0),
    fuente_fondos:fundingSource || 'bote',
    datos:data
  });
}

function normalizeProgramPayload(payload,fixedCombinations=[]) {
  const useFixed=Boolean(payload.usar_combinaciones_fijas);
  const total=Number(payload.importe_total || 0);
  const fixedPlayId=useFixed ? Number(payload.jugada_fija_id) : null;
  const count=useFixed
    ? fixedCombinations.filter((row)=>
        String(row.jugada_fija_id)===String(fixedPlayId) && row.activa
      ).length
    : 0;

  if (useFixed && !fixedPlayId) {
    throw new Error('Selecciona una jugada fija.');
  }

  if (useFixed && !count) {
    throw new Error('La jugada fija seleccionada no tiene combinaciones activas.');
  }

  return {
    temporada_id:Number(payload.temporada_id),
    juego_codigo:payload.juego_codigo,
    nombre:payload.nombre,
    activa:Boolean(payload.activa),
    dias_semana:payload.dias_semana,
    importe_total:total,
    importe_por_apuesta:useFixed
      ? Number((total/count).toFixed(2))
      : total,
    fuente_fondos:payload.fuente_fondos || 'cuotas',
    usar_combinaciones_fijas:useFixed,
    jugada_fija_id:fixedPlayId,
    datos_apuesta:useFixed ? {} : (payload.datos_apuesta || {}),
    observaciones:payload.observaciones || null
  };
}

export function createProgram(payload,fixedCombinations) {
  return adminInsert(
    'programacion_juegos',
    normalizeProgramPayload(payload,fixedCombinations)
  );
}

export function updateProgram(programId,payload,fixedCombinations) {
  const normalized=normalizeProgramPayload(payload,fixedCombinations);
  delete normalized.temporada_id;

  return adminUpdate(
    `programacion_juegos?id=eq.${encodeURIComponent(programId)}`,
    normalized
  );
}

export function setProgramActive(programId,active) {
  return adminUpdate(
    `programacion_juegos?id=eq.${encodeURIComponent(programId)}`,
    { activa:Boolean(active) }
  );
}

export function refreshScheduledDraws() {
  return adminRpc('refrescar_sorteos_programados',{});
}

export function checkDraw(drawId) {
  return adminFunction('comprobar-sorteos-selae',{ sorteo_id:Number(drawId) });
}

export async function updateDrawRefund(drawId,bets,refunds) {
  const fixedBets=bets.filter(
    (bet)=>Number(bet.sorteo_id)===Number(drawId) && bet.tipo==='fija'
  );

  if (!fixedBets.length) {
    throw new Error('Este sorteo no tiene combinaciones fijas.');
  }

  await Promise.all(
    fixedBets.map((bet)=>{
      const value=refunds[String(bet.id)];
      return adminUpdate(
        `apuestas?id=eq.${encodeURIComponent(bet.id)}`,
        {
          datos:{
            ...(bet.datos || {}),
            reintegro:value==='' || value===null ? null : Number(value)
          },
          comprobada:false,
          categoria_premio:null,
          premio:0,
          detalle_resultado:null
        }
      );
    })
  );

  return fixedBets.length;
}

export function deleteDraw(drawId) {
  return adminRpc('eliminar_sorteo',{
    p_sorteo_id:Number(drawId)
  });
}
