import { money } from '../utils/format.js';

const DAY_LABELS={1:'Lun',2:'Mar',3:'Mié',4:'Jue',5:'Vie',6:'Sáb',7:'Dom'};

function esc(value='') {
  return String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function dateEs(value) {
  if (!value) return '—';
  const [y,m,d]=String(value).split('-');
  return `${d}/${m}/${y}`;
}

function betNumbers(bet, game) {
  const data=bet.datos || {};

  if (game?.formato==='decimo') {
    return `Nº ${esc(String(data.numero || '').padStart(5,'0'))}`;
  }

  if (game?.formato==='5_estrellas') {
    const nums=(data.numeros || []).join(' · ');
    const stars=(data.estrellas || []).join(' · ');
    return `${nums}${stars ? ' · ★ '+stars : ''}`;
  }

  const nums=(data.numeros || []).join(' · ');
  const refund=data.reintegro !== null && data.reintegro !== undefined && data.reintegro !== ''
    ? ` · R ${esc(data.reintegro)}`
    : '';
  return nums + refund;
}

function gameMap(games) {
  return new Map((games || []).map((game)=>[game.codigo,game]));
}

export function renderPublicPrograms(programs = [], games = []) {
  const container=document.querySelector('#publicPrograms');
  if (!container) return;

  if (!programs.length) {
    container.innerHTML='<div class="empty-state"><span>◷</span><p>No hay apuestas programadas activas.</p></div>';
    return;
  }

  const map=gameMap(games);

  container.innerHTML=programs.map((program)=>{
    const game=map.get(program.juego_codigo);
    const days=(program.dias_semana || []).map((day)=>DAY_LABELS[Number(day)]).filter(Boolean);
    const weekly=Number(program.importe_total || 0) * days.length;

    return `
      <article class="public-program-card">
        <div>
          <small>${esc(game?.nombre || program.juego_codigo)}</small>
          <strong>${esc(program.nombre)}</strong>
          <span>${days.join(' · ')} · ${program.fuente_fondos==='bote'?'Bote':'Cuotas'}</span>
        </div>
        <div class="public-program-money">
          <strong>${money(program.importe_total)}</strong>
          <small>por sorteo</small>
          <span>${money(weekly)}/semana</span>
        </div>
      </article>
    `;
  }).join('');
}

function drawCard(draw, drawBets, game) {
  const total=drawBets.reduce((sum,bet)=>sum+Number(bet.importe || 0),0);
  const totalPrize=drawBets.reduce((sum,bet)=>sum+Number(bet.premio || 0),0);
  const checked=draw.estado==='comprobado';

  return `
    <article class="public-draw-card">
      <div class="public-draw-head">
        <div>
          <small>${esc(game?.nombre || draw.juego_codigo)}</small>
          <strong>${esc(draw.nombre || dateEs(draw.fecha))}</strong>
          <span>${dateEs(draw.fecha)} · ${drawBets.length} apuesta${drawBets.length===1?'':'s'}</span>
        </div>
        <span class="public-draw-status ${checked?'done':'live'}">
          ${checked?'Comprobado':draw.fecha > new Date().toISOString().slice(0,10)?'Programado':'En juego'}
        </span>
      </div>

      <div class="public-draw-summary">
        <span>Jugado <strong>${money(total)}</strong></span>
        ${checked ? `<span>Premio <strong>${money(totalPrize)}</strong></span>` : ''}
      </div>

      <details class="public-draw-details">
        <summary>Ver apuestas</summary>
        <div class="public-bet-list">
          ${drawBets.map((bet)=>`
            <div>
              <span>${esc(bet.descripcion || 'Apuesta')}</span>
              <strong>${betNumbers(bet,game) || '—'}</strong>
              ${checked && Number(bet.premio || 0)>0 ? `<b>+${money(bet.premio)}</b>` : ''}
            </div>
          `).join('')}
        </div>
      </details>
    </article>
  `;
}

export function renderPublicDraws({ draws = [], bets = [], games = [] }) {
  const activeBox=document.querySelector('#publicActiveDraws');
  const historyBox=document.querySelector('#publicDrawHistory');
  const specialBox=document.querySelector('#publicSpecialPlays');
  const specialTag=document.querySelector('#publicSpecialTag');

  const map=gameMap(games);
  const byDraw=new Map();
  bets.forEach((bet)=>{
    if (!byDraw.has(bet.sorteo_id)) byDraw.set(bet.sorteo_id,[]);
    byDraw.get(bet.sorteo_id).push(bet);
  });

  const active=draws
    .filter((draw)=>draw.estado!=='comprobado')
    .sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)) || Number(a.id)-Number(b.id));

  const history=draws
    .filter((draw)=>draw.estado==='comprobado')
    .sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha)) || Number(b.id)-Number(a.id));

  if (activeBox) {
    activeBox.innerHTML=active.length
      ? active.map((draw)=>drawCard(draw,byDraw.get(draw.id)||[],map.get(draw.juego_codigo))).join('')
      : '<div class="empty-state"><span>◇</span><p>No hay sorteos en juego.</p></div>';
  }

  if (historyBox) {
    historyBox.innerHTML=history.length
      ? history.slice(0,12).map((draw)=>drawCard(draw,byDraw.get(draw.id)||[],map.get(draw.juego_codigo))).join('')
      : '<div class="empty-state"><span>✓</span><p>Todavía no hay sorteos comprobados en esta temporada.</p></div>';
  }

  const specials=draws
    .filter((draw)=>!draw.programacion_id)
    .filter((draw)=>(byDraw.get(draw.id)||[]).some((bet)=>bet.tipo==='especial'));

  if (specialTag) {
    specialTag.textContent=specials.length ? `${specials.length} activa${specials.length===1?'':'s'}` : 'Sin activas';
  }

  if (specialBox) {
    specialBox.innerHTML=specials.length
      ? specials.slice(0,5).map((draw)=>{
          const drawBets=byDraw.get(draw.id)||[];
          const total=drawBets.reduce((sum,bet)=>sum+Number(bet.importe||0),0);
          return `
            <div class="special-play-row">
              <div>
                <strong>${esc(map.get(draw.juego_codigo)?.nombre || draw.juego_codigo)}</strong>
                <small>${dateEs(draw.fecha)} · ${esc(draw.nombre || 'Jugada especial')}</small>
              </div>
              <b>${money(total)}</b>
            </div>
          `;
        }).join('')
      : '<p class="muted no-margin">No hay jugadas especiales registradas.</p>';
  }

  document.querySelectorAll('[data-active-draw-count]').forEach((element)=>{
    element.textContent=String(active.length);
  });
}
