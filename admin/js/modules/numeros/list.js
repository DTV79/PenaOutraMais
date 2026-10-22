function esc(value='') {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function gameMap(games=[]) {
  return new Map(games.map((game)=>[game.codigo,game]));
}

function combinationBalls(row,game) {
  const numbers=(row.numeros || [])
    .map((number)=>`<span class="number-ball">${number}</span>`)
    .join('');

  const stars=game?.formato==='5_estrellas' && (row.estrellas || []).length
    ? `<span class="number-stars-label">★</span>` +
      row.estrellas.map((star)=>`<span class="number-ball number-star">${star}</span>`).join('')
    : '';

  return numbers + stars;
}

export function renderNumbersSnapshot({ season, games, fixedPlays, combinations }) {
  const summary=document.querySelector('#numbersSummary');
  const container=document.querySelector('#numbersAdmin');
  const seasonLabel=document.querySelector('[data-numbers-season]');

  if (!season) {
    container.innerHTML='<div class="admin-error visible">No hay temporada activa.</div>';
    return;
  }

  if (seasonLabel) seasonLabel.textContent=season.anio;

  const map=gameMap(games);
  const activePlays=fixedPlays.filter((row)=>row.activa);
  const activePlayIds=new Set(activePlays.map((row)=>String(row.id)));
  const activeCombinations=combinations.filter((row)=>row.activa && activePlayIds.has(String(row.jugada_fija_id)));
  const activeGames=new Set(activePlays.map((row)=>row.juego_codigo));

  summary.innerHTML=`
    <article class="admin-kpi"><small>Temporada</small><strong>${season.anio}</strong></article>
    <article class="admin-kpi"><small>Jugadas activas</small><strong>${activePlays.length}</strong></article>
    <article class="admin-kpi"><small>Combinaciones</small><strong>${activeCombinations.length}</strong></article>
    <article class="admin-kpi"><small>Juegos</small><strong>${activeGames.size}</strong></article>
  `;

  if (!fixedPlays.length) {
    container.innerHTML=`
      <div class="admin-empty">
        <span>⑩</span>
        <strong>No hay jugadas fijas</strong>
        <p>Crea una jugada fija y después añade dentro sus combinaciones.</p>
      </div>
    `;
    return;
  }

  container.innerHTML=`
    <div class="fixed-play-list">
      ${fixedPlays.map((play)=>{
        const game=map.get(play.juego_codigo);
        const rows=combinations
          .filter((row)=>String(row.jugada_fija_id)===String(play.id))
          .sort((a,b)=>Number(a.numero_orden)-Number(b.numero_orden));
        const activeCount=rows.filter((row)=>row.activa).length;

        return `
          <article class="fixed-play-card ${play.activa?'':'inactive'}">
            <header class="fixed-play-head">
              <div class="fixed-play-title">
                <p class="eyebrow">${esc(game?.nombre || play.juego_codigo)}</p>
                <h3>${esc(play.nombre)}</h3>
                <small>${activeCount} combinación${activeCount===1?'':'es'} activa${activeCount===1?'':'s'} · ${rows.length} total</small>
              </div>
              <span class="admin-status ${play.activa?'ok':'off'}">${play.activa?'Activa':'Inactiva'}</span>
            </header>

            ${play.observaciones ? `<p class="fixed-play-note">${esc(play.observaciones)}</p>` : ''}

            <div class="fixed-play-actions">
              <button class="admin-action secondary" type="button" data-fixed-play-edit="${play.id}">Editar jugada</button>
              <button class="admin-action secondary" type="button" data-combination-add="${play.id}">+ Añadir combinación</button>
              <button class="admin-action ${play.activa?'danger-soft':'secondary'}" type="button"
                data-fixed-play-toggle="${play.id}" data-fixed-play-active="${play.activa?'true':'false'}">
                ${play.activa?'Desactivar jugada':'Reactivar jugada'}
              </button>
              ${play.activa ? '' : `
                <button class="admin-action danger-soft" type="button" data-fixed-play-delete="${play.id}">
                  Eliminar jugada
                </button>
              `}
            </div>

            ${rows.length ? `
              <div class="fixed-play-combinations">
                ${rows.map((row)=>`
                  <article class="number-admin-card ${row.activa?'':'inactive'}">
                    <div class="number-admin-head">
                      <span class="number-order">${row.numero_orden}</span>
                      <div>
                        <strong>${esc(row.nombre || `Combinación ${row.numero_orden}`)}</strong>
                        <small>Orden ${row.numero_orden}</small>
                      </div>
                      <span class="admin-status ${row.activa?'ok':'off'}">${row.activa?'Activa':'Inactiva'}</span>
                    </div>

                    <div class="number-ball-row">
                      ${combinationBalls(row,game)}
                    </div>

                    <div class="number-admin-actions">
                      <button class="admin-action secondary" type="button" data-combination-edit="${row.id}">Editar</button>
                      <button class="admin-action ${row.activa?'danger-soft':''}" type="button"
                        data-combination-toggle="${row.id}" data-combination-active="${row.activa?'true':'false'}">
                        ${row.activa?'Desactivar':'Reactivar'}
                      </button>
                    </div>
                  </article>
                `).join('')}
              </div>
            ` : `
              <div class="admin-empty fixed-play-empty">
                <span>＋</span>
                <strong>Sin combinaciones</strong>
                <p>Añade la primera combinación de esta jugada.</p>
              </div>
            `}
          </article>
        `;
      }).join('')}
    </div>
  `;
}
