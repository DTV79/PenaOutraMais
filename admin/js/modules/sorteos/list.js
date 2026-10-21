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
    minimumFractionDigits:2,
    maximumFractionDigits:2
  }) + ' €';
}

function dateEs(value) {
  if (!value) return '—';
  const [y,m,d]=value.split('-');
  return `${d}/${m}/${y}`;
}

function statusLabel(draw) {
  if (draw.estado === 'comprobado' && draw.resultado?.revision_manual) return ['Revisar','review'];
  if (draw.estado === 'comprobado') return ['Comprobado','ok'];
  if (draw.estado === 'sin_resultado') return ['Pendiente SELAE','pending'];
  if (draw.estado === 'error') return ['Error','error'];
  return ['Pendiente','pending'];
}

function betSummary(bet, game) {
  const data=bet.datos || {};
  if (game?.formato === 'decimo') {
    return `Nº ${esc(String(data.numero || '').padStart(5,'0'))}`;
  }
  if (game?.formato === '5_estrellas') {
    return `${(data.numeros || []).join(' · ')} <span class="bet-stars">★ ${(data.estrellas || []).join(' · ')}</span>`;
  }
  return (data.numeros || []).join(' · ');
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

export function renderDraws({ season, games, draws, bets }) {
  const summary=document.querySelector('#drawsSummary');
  const box=document.querySelector('#drawsAdmin');
  const gameMap=new Map(games.map((game)=>[game.codigo,game]));
  const betsByDraw=new Map();

  bets.forEach((bet)=>{
    if (!betsByDraw.has(bet.sorteo_id)) betsByDraw.set(bet.sorteo_id,[]);
    betsByDraw.get(bet.sorteo_id).push(bet);
  });

  const checked=draws.filter((draw)=>draw.estado==='comprobado').length;
  const pending=draws.length-checked;
  const totalPrize=bets.reduce((sum,bet)=>sum+Number(bet.premio || 0),0);
  const special=bets.filter((bet)=>bet.tipo==='especial').length;

  summary.innerHTML=`
    <article class="admin-kpi"><small>Temporada</small><strong>${season?.anio || '—'}</strong></article>
    <article class="admin-kpi"><small>Pendientes</small><strong>${pending}</strong></article>
    <article class="admin-kpi"><small>Comprobados</small><strong>${checked}</strong></article>
    <article class="admin-kpi"><small>Premios detectados</small><strong>${money(totalPrize)}</strong></article>
  `;

  if (!draws.length) {
    box.innerHTML=`
      <div class="admin-empty">
        <span>◇</span><strong>Todavía no hay sorteos registrados</strong>
        <p>Puedes registrar el próximo sorteo habitual o añadir una apuesta especial.</p>
      </div>
    `;
    return;
  }

  box.innerHTML=draws.map((draw)=>{
    const game=gameMap.get(draw.juego_codigo);
    const drawBets=betsByDraw.get(draw.id) || [];
    const [label,statusClass]=statusLabel(draw);
    const prize=drawBets.reduce((sum,bet)=>sum+Number(bet.premio || 0),0);

    return `
      <article class="draw-admin-card">
        <header class="draw-admin-head">
          <div>
            <p class="eyebrow">${esc(game?.nombre || draw.juego_codigo)}</p>
            <h3>${esc(draw.nombre || dateEs(draw.fecha))}</h3>
            <small>${dateEs(draw.fecha)} · ${drawBets.length} apuesta${drawBets.length===1?'':'s'}${draw.automatico?' · Automático':''}</small>
          </div>
          <span class="draw-status ${statusClass}">${label}</span>
        </header>

        ${resultSummary(draw,game)}

        <div class="draw-bets">
          ${drawBets.map((bet)=>`
            <div class="draw-bet-row">
              <div>
                <strong>${esc(bet.descripcion || (bet.tipo==='fija'?'Combinación fija':'Apuesta especial'))}</strong>
                <small>${betSummary(bet,game)}</small>
              </div>
              <div class="draw-bet-prize">
                ${bet.categoria_premio ? `<small>${esc(bet.categoria_premio)}</small>` : ''}
                <strong>${money(bet.premio)}</strong>
              </div>
            </div>
          `).join('')}
        </div>

        ${draw.error_comprobacion ? `<p class="draw-message">${esc(draw.error_comprobacion)}</p>` : ''}
        ${draw.resultado?.revision_manual ? '<p class="draw-message warning">Revisión manual necesaria antes de considerar definitivo el premio.</p>' : ''}
        ${prize > 0 ? `<p class="draw-total">Premio detectado <strong>${money(prize)}</strong></p>` : ''}

        <footer class="draw-admin-actions">
          ${draw.fuente_url ? `<a class="admin-action secondary" href="${esc(draw.fuente_url)}" target="_blank" rel="noopener">Ver SELAE</a>` : ''}
          <button class="admin-action" type="button" data-draw-check="${draw.id}">Comprobar ahora</button>
        </footer>
      </article>
    `;
  }).join('');
}
