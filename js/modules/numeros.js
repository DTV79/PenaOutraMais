import { romans } from '../data/fallback.js';

function esc(value='') {
  return String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function renderBalls(combination,game) {
  const balls=(combination.numeros || [])
    .map((number)=>`<span class="public-number-ball">${esc(number)}</span>`)
    .join('');

  if (game?.formato !== '5_estrellas' || !(combination.estrellas || []).length) {
    return balls;
  }
  return balls + '<span class="public-number-stars-label">★</span>' +
    combination.estrellas.map((star)=>`<span class="public-number-ball public-star-ball">${esc(star)}</span>`).join('');
}

export function renderCombinations(fixedPlays=[],rows=[],games=[]) {
  const container=document.querySelector('#combinations');
  if (!container) return;

  const combinations=Array.isArray(rows)?rows:[];
  const playRows=Array.isArray(fixedPlays)?fixedPlays:[];
  const gameMap=new Map((Array.isArray(games)?games:[]).map((game)=>[game.codigo,game]));

  const activePlays=playRows
    .filter((play)=>play.activa!==false && combinations.some((row)=>String(row.jugada_fija_id)===String(play.id)));
  const activeIds=new Set(activePlays.map((play)=>String(play.id)));
  const activeCombinations=combinations.filter((row)=>activeIds.has(String(row.jugada_fija_id)));
  const activeGames=new Set(activePlays.map((play)=>play.juego_codigo));

  document.querySelectorAll('[data-fixed-play-count]').forEach((el)=>{
    el.textContent=String(activePlays.length);
  });
  document.querySelectorAll('[data-fixed-combination-count]').forEach((el)=>{
    el.textContent=String(activeCombinations.length);
  });
  document.querySelectorAll('[data-fixed-game-count]').forEach((el)=>{
    el.textContent=String(activeGames.size);
  });

  container.innerHTML=activePlays.length ? activePlays.map((play)=>{
    const game=gameMap.get(play.juego_codigo);
    const matches=activeCombinations
      .filter((row)=>String(row.jugada_fija_id)===String(play.id))
      .sort((a,b)=>Number(a.numero_orden)-Number(b.numero_orden));

    return `
      <article class="public-fixed-play">
        <header class="public-fixed-play-head">
          <p class="public-fixed-game">${esc(game?.nombre || play.juego_codigo)}</p>
          <h3>${esc(play.nombre)}</h3>
          <small>${matches.length} combinación${matches.length===1?'':'es'}</small>
        </header>

        <div class="public-fixed-combinations">
          ${matches.map((row,index)=>{
            const order=Number(row.numero_orden) || index + 1;
            return `
              <article class="public-number-card">
                <div class="public-number-card-head">
                  <span class="public-number-order">${esc(order)}</span>
                  <div>
                    <strong>${esc(row.nombre || `Combinación ${romans[index] || order}`)}</strong>
                    <small>Orden ${esc(order)}</small>
                  </div>
                </div>
                <div class="public-number-balls">
                  ${renderBalls(row,game)}
                </div>
              </article>
            `;
          }).join('')}
        </div>
      </article>
    `;
  }).join('') : '<p class="public-numbers-empty">No hay jugadas fijas publicadas en esta temporada.</p>';
}
