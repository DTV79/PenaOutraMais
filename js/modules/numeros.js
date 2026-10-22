import { fallbackCombinations, romans } from '../data/fallback.js';

function esc(value='') {
  return String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;');
}

function fallbackData() {
  return {
    fixedPlays:[{
      id:'fallback',
      nombre:'Combinaciones Fijas Peña Outra Máis',
      juego_codigo:'primitiva',
      activa:true
    }],
    combinations:fallbackCombinations.map((numeros,index)=>({
      id:`fallback-${index+1}`,
      jugada_fija_id:'fallback',
      numero_orden:index+1,
      nombre:`Combinación ${romans[index]}`,
      numeros,
      estrellas:[],
      juego_codigo:'primitiva'
    })),
    games:[{codigo:'primitiva',nombre:'La Primitiva',formato:'6_numeros'}]
  };
}

export function renderCombinations(fixedPlays,rows,games) {
  const container=document.querySelector('#combinations');
  if (!container) return;

  const data=fixedPlays?.length
    ? {fixedPlays,combinations:rows || [],games:games || []}
    : fallbackData();

  const gameMap=new Map(data.games.map((game)=>[game.codigo,game]));
  const combinations=data.combinations || [];
  const activePlays=(data.fixedPlays || []).filter((play)=>
    combinations.some((row)=>String(row.jugada_fija_id)===String(play.id))
  );
  const activeGames=new Set(activePlays.map((play)=>play.juego_codigo));

  document.querySelectorAll('[data-fixed-play-count]').forEach((el)=>{
    el.textContent=String(activePlays.length);
  });
  document.querySelectorAll('[data-fixed-combination-count]').forEach((el)=>{
    el.textContent=String(combinations.length);
  });
  document.querySelectorAll('[data-fixed-game-count]').forEach((el)=>{
    el.textContent=String(activeGames.size);
  });

  container.innerHTML=activePlays.map((play)=>{
    const game=gameMap.get(play.juego_codigo);
    const playRows=combinations.filter(
      (row)=>String(row.jugada_fija_id)===String(play.id)
    );

    return `
      <section class="public-fixed-play">
        <div class="public-fixed-play-head">
          <div>
            <small>${esc(game?.nombre || play.juego_codigo)}</small>
            <strong>${esc(play.nombre)}</strong>
            <span>${playRows.length} combinación${playRows.length===1?'':'es'}</span>
          </div>
          <span class="pill">Fija</span>
        </div>

        <div class="public-fixed-combinations">
          ${playRows.map((row,index)=>`
            <article class="combination-card">
              <div class="combination-header">
                <strong>${esc(row.nombre || `Combinación ${romans[index] || row.numero_orden}`)}</strong>
                <span>${row.numero_orden}</span>
              </div>
              <div class="balls">
                ${(row.numeros || []).map((number)=>`<span class="ball">${number}</span>`).join('')}
                ${game?.formato==='5_estrellas' && (row.estrellas || []).length
                  ? '<em class="public-star-separator">★</em>' +
                    row.estrellas.map((star)=>`<span class="ball star-ball">${star}</span>`).join('')
                  : ''}
              </div>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }).join('');
}
