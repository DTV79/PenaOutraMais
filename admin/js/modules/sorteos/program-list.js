const DAY_LABELS={1:'Lun',2:'Mar',3:'Mié',4:'Jue',5:'Vie',6:'Sáb',7:'Dom'};

function esc(value='') {
  return String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;');
}

function money(value) {
  return Number(value || 0).toLocaleString('es-ES',{
    useGrouping:'always',
    minimumFractionDigits:2,
    maximumFractionDigits:2
  }) + ' €';
}

function templateSummary(program,game,fixedPlays,fixedCombinations) {
  if (program.usar_combinaciones_fijas) {
    const play=fixedPlays.find((row)=>String(row.id)===String(program.jugada_fija_id));
    const count=fixedCombinations.filter((row)=>
      String(row.jugada_fija_id)===String(program.jugada_fija_id) && row.activa
    ).length;
    return play
      ? `${esc(play.nombre)} · ${count} combinación${count===1?'':'es'}`
      : 'Jugada fija no disponible';
  }

  const data=program.datos_apuesta || {};
  if (game?.formato==='5_estrellas') {
    return `${(data.numeros || []).join(' · ')} · ★ ${(data.estrellas || []).join(' · ')}`;
  }

  if (game?.formato==='decimo') {
    return `Nº ${esc(String(data.numero || '').padStart(5,'0'))}`;
  }

  return (data.numeros || []).join(' · ');
}

export function renderPrograms({
  programs,
  games,
  fixedPlays=[],
  fixedCombinations=[]
}) {
  const box=document.querySelector('#programsAdmin');
  const badge=document.querySelector('[data-tab-count="programadas"]');
  const gameMap=new Map(games.map((game)=>[game.codigo,game]));

  if (badge) badge.textContent=programs.length;

  if (!programs.length) {
    box.innerHTML=`
      <div class="admin-empty">
        <span>◷</span>
        <strong>No hay apuestas programadas</strong>
        <p>Crea una programación y elige qué jugada fija usar o define una combinación directamente.</p>
      </div>
    `;
    return;
  }

  box.innerHTML=`
    <div class="program-card-list">
      ${programs.map((program)=>{
        const game=gameMap.get(program.juego_codigo);
        const days=(program.dias_semana || []).map((day)=>DAY_LABELS[day]).join(' · ');
        const weekly=Number(program.importe_total || 0)*(program.dias_semana || []).length;

        return `
          <article class="program-card ${program.activa?'':'inactive'}">
            <div class="program-card-head">
              <div>
                <p class="eyebrow">${esc(game?.nombre || program.juego_codigo)}</p>
                <h3>${esc(program.nombre)}</h3>
                <small>${days || 'Sin días'} · ${program.fuente_fondos==='bote'?'Bote':'Cuotas'}</small>
              </div>
              <span class="draw-status ${program.activa?'ok':'review'}">
                ${program.activa?'Activa':'Desactivada'}
              </span>
            </div>

            <div class="program-card-grid">
              <div><small>Por sorteo</small><strong>${money(program.importe_total)}</strong></div>
              <div><small>Por semana</small><strong>${money(weekly)}</strong></div>
              <div class="program-template">
                <small>${program.usar_combinaciones_fijas?'Jugada fija':'Jugada'}</small>
                <strong>${templateSummary(program,game,fixedPlays,fixedCombinations)}</strong>
              </div>
            </div>

            <div class="program-card-actions">
              <button class="admin-action secondary" type="button" data-program-edit="${program.id}">Editar</button>
              <button class="admin-action ${program.activa?'danger-soft':'secondary'}" type="button"
                data-program-toggle="${program.id}" data-next-active="${program.activa?'false':'true'}">
                ${program.activa?'Desactivar':'Activar'}
              </button>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}
