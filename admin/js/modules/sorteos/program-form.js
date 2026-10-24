import { openModal, closeModal } from '../../ui/modal.js';

const DAYS=[
  [1,'Lun'],[2,'Mar'],[3,'Mié'],[4,'Jue'],[5,'Vie'],[6,'Sáb'],[7,'Dom']
];

function esc(value='') {
  return String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('"','&quot;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
}

function numberFields(prefix,count,min,max,values=[],label='Nº') {
  return `
    <div class="bet-number-grid ${count===5?'five':''}">
      ${Array.from({length:count},(_,i)=>`
        <div class="admin-form-field bet-number-field">
          <label>${label} ${i+1}</label>
          <input name="${prefix}_${i+1}" type="number"
            min="${min}" max="${max}" step="1" inputmode="numeric"
            value="${esc(values[i] ?? '')}" required />
        </div>
      `).join('')}
    </div>
  `;
}

function readIntegerList(data,prefix,count,min,max) {
  const values=Array.from({length:count},(_,i)=>Number(data.get(`${prefix}_${i+1}`)));
  if (values.some((n)=>!Number.isInteger(n) || n<min || n>max)) {
    throw new Error(`Completa todos los valores entre ${min} y ${max}.`);
  }
  if (new Set(values).size!==values.length) {
    throw new Error('No puede haber números repetidos.');
  }
  return values.sort((a,b)=>a-b);
}

function manualFields(game,data={}) {
  if (game?.formato==='5_estrellas') {
    return `
      <div class="admin-form-wide">
        <p class="admin-form-subtitle">Números</p>
        ${numberFields('program_numero',5,1,50,data.numeros || [])}
      </div>
      <div class="admin-form-wide">
        <p class="admin-form-subtitle">Estrellas</p>
        ${numberFields('program_estrella',2,1,12,data.estrellas || [],'Estrella')}
      </div>
      <p class="admin-form-help admin-form-wide">
        El código de El Millón cambia con el resguardo y se completará en el sorteo correspondiente.
      </p>
    `;
  }

  if (game?.formato==='decimo') {
    return `
      <div class="admin-form-field">
        <label>Número *</label>
        <input name="program_decimo" type="text" inputmode="numeric"
          maxlength="5" pattern="[0-9]{5}" value="${esc(data.numero || '')}"
          placeholder="00000" required />
      </div>
      <div class="admin-form-field">
        <label>Cantidad</label>
        <input name="program_cantidad" type="number" min="1" step="1"
          value="${esc(data.cantidad || 1)}" />
      </div>
    `;
  }

  return `
    <div class="admin-form-wide">
      <p class="admin-form-subtitle">Números</p>
      ${numberFields('program_numero',6,1,49,data.numeros || [])}
    </div>
    <p class="admin-form-help admin-form-wide">
      El reintegro se añadirá después en cada sorteo porque depende del resguardo.
    </p>
  `;
}

export function openProgramForm({
  season,
  games,
  fixedPlays,
  fixedCombinations,
  program=null,
  onSave
}) {
  const editing=Boolean(program);
  const initialGame=games.find((game)=>game.codigo===program?.juego_codigo) || games[0];
  const initialDays=new Set((program?.dias_semana || []).map(Number));
  const initialMode=program?.usar_combinaciones_fijas ? 'fixed' : 'manual';

  const modal=openModal({
    title:editing?'Editar apuesta programada':'Nueva apuesta programada',
    subtitle:`TEMPORADA ${season.anio}`,
    content:`
      <form id="programForm" class="admin-form">
        <div class="admin-form-grid">
          <div class="admin-form-field">
            <label for="program-name">Nombre *</label>
            <input id="program-name" name="nombre" type="text"
              value="${esc(program?.nombre || '')}"
              placeholder="Ej. Primitiva jueves y sábado" required />
          </div>

          <div class="admin-form-field">
            <label for="program-game">Juego *</label>
            <select id="program-game" name="juego" ${editing?'disabled':''} required>
              ${games.map((game)=>`
                <option value="${esc(game.codigo)}" ${game.codigo===initialGame?.codigo?'selected':''}>
                  ${esc(game.nombre)}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="admin-form-field">
            <label for="program-amount">Importe total por sorteo *</label>
            <input id="program-amount" name="importe_total" type="number"
              min="0" step="0.01" value="${Number(program?.importe_total || 0).toFixed(2)}" required />
          </div>

          <div class="admin-form-field">
            <label for="program-funding">Financiar con *</label>
            <select id="program-funding" name="fuente_fondos" required>
              <option value="cuotas" ${program?.fuente_fondos!=='bote'?'selected':''}>Cuotas</option>
              <option value="bote" ${program?.fuente_fondos==='bote'?'selected':''}>Bote</option>
            </select>
          </div>

          <div class="admin-form-field admin-form-wide" id="programModeField">
            <label for="program-mode">Tipo de jugada *</label>
            <select id="program-mode" name="modo">
              <option value="fixed" ${initialMode==='fixed'?'selected':''}>Usar una jugada fija guardada</option>
              <option value="manual" ${initialMode==='manual'?'selected':''}>Definir una combinación directamente</option>
            </select>
            <small class="field-note">Las jugadas fijas se crean y editan desde la sección Números.</small>
          </div>

          <div class="admin-form-field admin-form-wide" id="programFixedPlayField">
            <label for="program-fixed-play">Jugada fija *</label>
            <select id="program-fixed-play" name="jugada_fija_id"></select>
            <small id="programFixedPlayHelp" class="field-note"></small>
          </div>

          <div class="admin-form-wide">
            <p class="admin-form-subtitle">Días de juego</p>
            <div class="weekday-grid program-weekdays">
              ${DAYS.map(([value,label])=>`
                <label class="weekday-option ${initialDays.has(value)?'selected':''}">
                  <input type="checkbox" name="dia" value="${value}" ${initialDays.has(value)?'checked':''} />
                  <span>${label}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="admin-form-field admin-form-wide">
            <label for="program-show-day">Mostrar en “En Juego” desde *</label>
            <select id="program-show-day" name="mostrar_desde_dia" required>
              ${DAYS.map(([value,label])=>`
                <option value="${value}" ${Number(program?.mostrar_desde_dia || 1)===value?'selected':''}>
                  ${label}
                </option>
              `).join('')}
            </select>
            <small class="field-note">Ese día se crearán y mostrarán los sorteos programados que correspondan hasta el domingo de esa semana de juego.</small>
          </div>

          <div id="programTemplateFields" class="admin-form-wide"></div>

          <label class="admin-check-row admin-form-wide">
            <input name="activa" type="checkbox" ${program?.activa!==false?'checked':''} />
            <span>
              <strong>Programación activa</strong>
              <small>Los próximos sorteos se crearán automáticamente.</small>
            </span>
          </label>

          <div class="admin-form-field admin-form-wide">
            <label for="program-notes">Observaciones</label>
            <textarea id="program-notes" name="observaciones" rows="2">${esc(program?.observaciones || '')}</textarea>
          </div>
        </div>

        <div id="programFormError" class="admin-error"></div>
      </form>
    `,
    actions:`
      <button class="admin-action secondary" type="button" data-modal-close>Cancelar</button>
      <button class="admin-action" type="submit" form="programForm" id="programSave">
        ${editing?'Guardar cambios':'Crear programación'}
      </button>
    `
  });

  const form=modal.querySelector('#programForm');
  const gameSelect=modal.querySelector('#program-game');
  const modeSelect=modal.querySelector('#program-mode');
  const modeField=modal.querySelector('#programModeField');
  const fixedField=modal.querySelector('#programFixedPlayField');
  const fixedSelect=modal.querySelector('#program-fixed-play');
  const fixedHelp=modal.querySelector('#programFixedPlayHelp');
  const templateBox=modal.querySelector('#programTemplateFields');
  const save=modal.querySelector('#programSave');
  const errorBox=modal.querySelector('#programFormError');

  function selectedGame() {
    const code=editing ? program.juego_codigo : gameSelect.value;
    return games.find((game)=>game.codigo===code) || games[0];
  }

  function availableFixedPlays() {
    const game=selectedGame();
    return fixedPlays.filter((play)=>
      play.juego_codigo===game?.codigo &&
      (play.activa || String(play.id)===String(program?.jugada_fija_id || ''))
    );
  }

  function renderFixedOptions() {
    const game=selectedGame();
    const supported=['6_numeros','5_estrellas'].includes(game?.formato);
    const options=supported ? availableFixedPlays() : [];

    if (!supported) {
      modeSelect.value='manual';
      modeField.style.display='none';
    } else {
      modeField.style.display='';
    }

    fixedSelect.innerHTML=options.length
      ? options.map((play)=>`
          <option value="${play.id}" ${String(play.id)===String(program?.jugada_fija_id || '')?'selected':''}>
            ${esc(play.nombre)}${play.activa?'':' · Inactiva'}
          </option>
        `).join('')
      : '<option value="">No hay jugadas fijas para este juego</option>';

    if (!editing && options.length && modeSelect.value==='fixed' && !fixedSelect.value) {
      fixedSelect.value=String(options[0].id);
    }

    if (!options.length && modeSelect.value==='fixed') {
      modeSelect.value='manual';
    }
  }

  function selectedFixedPlay() {
    return fixedPlays.find((play)=>String(play.id)===String(fixedSelect.value));
  }

  function renderTemplate() {
    renderFixedOptions();
    const game=selectedGame();
    const useFixed=modeSelect.value==='fixed';
    fixedField.style.display=useFixed ? '' : 'none';

    if (useFixed) {
      const play=selectedFixedPlay();
      const count=fixedCombinations.filter((row)=>
        String(row.jugada_fija_id)===String(play?.id) && row.activa
      ).length;
      fixedHelp.textContent=play
        ? `${count} combinación${count===1?'':'es'} activa${count===1?'':'s'} · ${game?.nombre || ''}`
        : 'Crea antes una jugada fija en Números.';
      templateBox.innerHTML=play ? `
        <div class="program-fixed-note">
          <strong>${esc(play.nombre)}</strong>
          <small>Se utilizarán sus ${count} combinaciones activas. Cada programación puede asignar días distintos a una jugada diferente.</small>
        </div>
      ` : '';
      return;
    }

    templateBox.innerHTML=manualFields(
      game,
      editing ? (program.datos_apuesta || {}) : {}
    );
  }

  gameSelect?.addEventListener('change',()=>{
    modeSelect.value=availableFixedPlays().length ? 'fixed' : 'manual';
    renderTemplate();
  });
  modeSelect?.addEventListener('change',renderTemplate);
  fixedSelect?.addEventListener('change',renderTemplate);

  form.querySelectorAll('.weekday-option input').forEach((input)=>{
    input.addEventListener('change',()=>{
      input.closest('.weekday-option')?.classList.toggle('selected',input.checked);
    });
  });

  renderTemplate();

  form.addEventListener('submit',async(event)=>{
    event.preventDefault();
    errorBox.classList.remove('visible');
    save.disabled=true;
    save.textContent='Guardando…';

    try {
      const data=new FormData(form);
      const game=selectedGame();
      const days=data.getAll('dia').map(Number).sort((a,b)=>a-b);
      const active=data.get('activa')==='on';
      const useFixed=modeSelect.value==='fixed';

      if (!days.length) throw new Error('Selecciona al menos un día de juego.');

      let fixedPlay=null;
      let betData={};

      if (useFixed) {
        fixedPlay=selectedFixedPlay();
        if (!fixedPlay) throw new Error('Selecciona una jugada fija.');
        if (fixedPlay.juego_codigo!==game.codigo) {
          throw new Error('La jugada fija no corresponde al juego seleccionado.');
        }
        if (active && !fixedPlay.activa) {
          throw new Error('No puedes activar una programación con una jugada fija inactiva.');
        }
      } else if (game.formato==='5_estrellas') {
        betData={
          numeros:readIntegerList(data,'program_numero',5,1,50),
          estrellas:readIntegerList(data,'program_estrella',2,1,12),
          codigo_millon:null
        };
      } else if (game.formato==='decimo') {
        const number=String(data.get('program_decimo') || '').trim();
        if (!/^\d{5}$/.test(number)) {
          throw new Error('El número debe tener exactamente 5 cifras.');
        }
        betData={
          numero:number,
          cantidad:Math.max(1,Number(data.get('program_cantidad') || 1))
        };
      } else {
        betData={
          numeros:readIntegerList(data,'program_numero',6,1,49),
          reintegro:null
        };
      }

      const name=String(data.get('nombre') || '').trim();
      if (!name) throw new Error('Escribe un nombre para la programación.');

      await onSave({
        temporada_id:season.id,
        juego_codigo:game.codigo,
        nombre:name,
        activa:active,
        dias_semana:days,
        mostrar_desde_dia:Number(data.get('mostrar_desde_dia') || 1),
        importe_total:Number(data.get('importe_total') || 0),
        fuente_fondos:String(data.get('fuente_fondos') || 'cuotas'),
        usar_combinaciones_fijas:useFixed,
        jugada_fija_id:useFixed ? Number(fixedPlay.id) : null,
        datos_apuesta:betData,
        observaciones:String(data.get('observaciones') || '').trim() || null
      });

      closeModal();
    } catch(error) {
      errorBox.textContent=error?.message || 'No se pudo guardar la programación.';
      errorBox.classList.add('visible');
      save.disabled=false;
      save.textContent=editing?'Guardar cambios':'Crear programación';
    }
  });
}
