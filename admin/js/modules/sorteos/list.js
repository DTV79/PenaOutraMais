function esc(value='') {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function money(value) {
  return Number(value || 0).toLocaleString('es-ES',{
    useGrouping:'always',
    minimumFractionDigits:2,
    maximumFractionDigits:2
  }) + ' €';
}

function dateEs(value) {
  if (!value) return '—';
  const [y,m,d]=value.split('-');
  return `${d}/${m}/${y}`;
}

function dateWithWeekday(value) {
  if (!value) return '—';
  const [y,m,d]=String(value).split('-').map(Number);
  const names=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const weekday=names[new Date(Date.UTC(y,m-1,d)).getUTCDay()];
  return `${weekday}, ${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
}

function dateSortValue(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const [y,m,d]=String(value).split('-').map(Number);
  return (y * 10000) + (m * 100) + d;
}

function todayIso() {
  const now=new Date();
  const local=new Date(now.getTime()-now.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
}

function statusLabel(draw) {
  if (draw.estado === 'pendiente' && draw.fecha > todayIso()) return ['Programado','scheduled'];
  if (draw.estado === 'comprobado' && draw.resultado?.revision_manual) return ['Revisar','review'];
  if (draw.estado === 'comprobado') return ['Comprobado','ok'];
  if (draw.estado === 'sin_resultado') return ['Pendiente SELAE','pending'];
  if (draw.estado === 'error') return ['Error','error'];
  return ['Pendiente','pending'];
}

function fundLabel(source) {
  return source === 'bote' ? 'Bote' : 'Cuotas';
}

function betSummary(bet, game) {
  const data=bet.datos || {};
  if (game?.formato === 'decimo') {
    return `Nº ${esc(String(data.numero || '').padStart(5,'0'))}`;
  }
  if (game?.formato === '5_estrellas') {
    return `${(data.numeros || []).join(' · ')} <span class="bet-stars">★ ${(data.estrellas || []).join(' · ')}</span>`;
  }
  const numbers=(data.numeros || []).join(' · ');
  const refund=data.reintegro !== null && data.reintegro !== undefined && data.reintegro !== ''
    ? ` <span class="bet-refund">R ${esc(data.reintegro)}</span>`
    : '';
  return numbers + refund;
}

function resultSummary(draw, game) {
  const result=draw.resultado;
  if (!result) return '';

  if (game?.formato === 'decimo') {
    return `
      <div class="draw-result-line">
        <strong>1º ${esc(result.primer_premio || '—')}</strong>
        <span>2º ${esc(result.segundo_premio || '—')}</span>
        <span>R ${(result.reintegros || []).join(' · ') || '—'}</span>
      </div>
    `;
  }

  const numbers=(result.numeros || []).map((n)=>`<span>${n}</span>`).join('');
  const extra=game?.formato === '5_estrellas'
    ? `<em>★ ${(result.estrellas || []).join(' · ')}</em>`
    : `<em>C ${result.complementario ?? '—'} · R ${result.reintegro ?? '—'}</em>`;

  return `
    <div class="draw-result-balls">${numbers}</div>
    <div class="draw-result-extra">${extra}</div>
  `;
}

function renderCard(draw, drawBets, game, program=null, fixedPlay=null) {
  const [label,statusClass]=statusLabel(draw);
  const prize=drawBets.reduce((sum,bet)=>sum+Number(bet.premio || 0),0);
  const stake=drawBets.reduce((sum,bet)=>sum+Number(bet.importe || 0),0);
  const quotaStake=drawBets
    .filter((bet)=>bet.fuente_fondos !== 'bote')
    .reduce((sum,bet)=>sum+Number(bet.importe || 0),0);
  const potStake=drawBets
    .filter((bet)=>bet.fuente_fondos === 'bote')
    .reduce((sum,bet)=>sum+Number(bet.importe || 0),0);

  const fundingText = quotaStake > 0 && potStake > 0
    ? `Cuotas ${money(quotaStake)} · Bote ${money(potStake)}`
    : '';

  const fixedAutomatic=Boolean(
    draw.automatico &&
    program?.usar_combinaciones_fijas &&
    fixedPlay
  );
  const title=fixedAutomatic
    ? dateWithWeekday(draw.fecha)
    : (draw.nombre || dateEs(draw.fecha));
  const detailPrefix=fixedAutomatic
    ? fixedPlay.nombre
    : dateEs(draw.fecha);

  return `
    <article class="draw-admin-card">
      <header class="draw-admin-head">
        <div>
          <p class="eyebrow">${esc(game?.nombre || draw.juego_codigo)}</p>
          <h3>${esc(title)}</h3>
          <small>${esc(detailPrefix)} · ${drawBets.length} apuesta${drawBets.length===1?'':'s'}${draw.automatico?' · Automático':''}</small>
        </div>
        <span class="draw-status ${statusClass}">${label}</span>
      </header>

      ${resultSummary(draw,game)}

      <div class="draw-stake-summary">
        <div class="draw-stake-row">
          <span>Total jugado</span>
          <strong>${money(stake)}</strong>
        </div>
        ${draw.estado === 'comprobado'
          ? `<div class="draw-stake-row draw-winnings-summary"><span>Total ganado</span><strong>${money(prize)}</strong></div>`
          : ''}
        ${fundingText ? `<small>${fundingText}</small>` : ''}
      </div>

      <div class="draw-bets">
        ${drawBets.map((bet)=>`
          <div class="draw-bet-row">
            <div>
              <strong>
                ${esc(bet.descripcion || (bet.tipo==='fija'?'Combinación fija':'Apuesta especial'))}
                <span class="fund-source ${bet.fuente_fondos === 'bote' ? 'pot' : 'fees'}">${fundLabel(bet.fuente_fondos)}</span>
              </strong>
              <small>${betSummary(bet,game)}</small>
            </div>
            <div class="draw-bet-prize">
              ${draw.estado === 'comprobado'
                ? `${bet.categoria_premio ? `<small>${esc(bet.categoria_premio)}</small>` : '<small>Premio</small>'}<strong>${money(bet.premio)}</strong>`
                : `<small>Jugado</small><strong>${money(bet.importe)}</strong>`}
            </div>
          </div>
        `).join('')}
      </div>

      ${draw.error_comprobacion ? `<p class="draw-message">${esc(draw.error_comprobacion)}</p>` : ''}
      ${draw.resultado?.revision_manual ? '<p class="draw-message warning">Revisión manual necesaria antes de considerar definitivo el premio.</p>' : ''}
      ${prize > 0 ? `<p class="draw-total">Premio detectado <strong>${money(prize)}</strong></p>` : ''}

      <footer class="draw-admin-actions">
        <button class="admin-action danger-soft" type="button" data-draw-delete="${draw.id}">Eliminar sorteo</button>
        ${game?.formato === '6_numeros' && drawBets.some((bet)=>bet.tipo==='fija') ? `
          <button class="admin-action secondary" type="button" data-draw-refund="${draw.id}">Reintegros</button>
        ` : ''}
        ${draw.fuente_url ? `<a class="admin-action secondary" href="${esc(draw.fuente_url)}" target="_blank" rel="noopener">Ver SELAE</a>` : ''}
        <button class="admin-action" type="button" data-draw-check="${draw.id}">Comprobar ahora</button>
      </footer>
    </article>
  `;
}

export function renderDraws({ season, games, draws, bets, programs=[], fixedPlays=[] }) {
  const summary=document.querySelector('#drawsSummary');
  const activeBox=document.querySelector('#drawsActive');
  const historyBox=document.querySelector('#drawsHistory');
  const gameMap=new Map(games.map((game)=>[game.codigo,game]));
  const programMap=new Map(programs.map((program)=>[String(program.id),program]));
  const fixedPlayMap=new Map(fixedPlays.map((play)=>[String(play.id),play]));
  const betsByDraw=new Map();

  bets.forEach((bet)=>{
    if (!betsByDraw.has(bet.sorteo_id)) betsByDraw.set(bet.sorteo_id,[]);
    betsByDraw.get(bet.sorteo_id).push(bet);
  });

  const active=draws
    .filter((draw)=>draw.estado!=='comprobado')
    .sort((a,b)=>dateSortValue(a.fecha)-dateSortValue(b.fecha) || Number(a.id)-Number(b.id));

  const history=draws
    .filter((draw)=>draw.estado==='comprobado')
    .sort((a,b)=>dateSortValue(b.fecha)-dateSortValue(a.fecha) || Number(b.id)-Number(a.id));
  const activeBadge=document.querySelector('[data-tab-count="enjuego"]');
  const historyBadge=document.querySelector('[data-tab-count="historico"]');
  if (activeBadge) activeBadge.textContent=active.length;
  if (historyBadge) historyBadge.textContent=history.length;

  const totalPrize=bets.reduce((sum,bet)=>sum+Number(bet.premio || 0),0);
  summary.innerHTML=`
    <article class="admin-kpi"><small>Temporada</small><strong>${season?.anio || '—'}</strong></article>
    <article class="admin-kpi"><small>Sorteos activos</small><strong>${active.length}</strong></article>
    <article class="admin-kpi"><small>Premios</small><strong>${money(totalPrize)}</strong></article>
  `;

  activeBox.innerHTML=active.length
    ? active.map((draw)=>{
        const program=programMap.get(String(draw.programacion_id));
        const fixedPlay=program?.jugada_fija_id
          ? fixedPlayMap.get(String(program.jugada_fija_id))
          : null;
        return renderCard(
          draw,
          betsByDraw.get(draw.id)||[],
          gameMap.get(draw.juego_codigo),
          program,
          fixedPlay
        );
      }).join('')
    : `
      <div class="admin-empty">
        <span>◇</span><strong>No hay sorteos activos</strong>
        <p>Los próximos sorteos habituales aparecerán aquí cuando se creen.</p>
      </div>
    `;

  historyBox.innerHTML=history.length
    ? history.map((draw)=>{
        const program=programMap.get(String(draw.programacion_id));
        const fixedPlay=program?.jugada_fija_id
          ? fixedPlayMap.get(String(program.jugada_fija_id))
          : null;
        return renderCard(
          draw,
          betsByDraw.get(draw.id)||[],
          gameMap.get(draw.juego_codigo),
          program,
          fixedPlay
        );
      }).join('')
    : `
      <div class="admin-empty">
        <span>✓</span><strong>Todavía no hay sorteos comprobados</strong>
        <p>Cuando se comprueben pasarán automáticamente al histórico.</p>
      </div>
    `;
}
