import { openModal, closeModal } from '../../ui/modal.js';

function esc(value='') {
  return String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('"','&quot;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
}

function supportedGames(games=[]) {
  return games.filter((game)=>['6_numeros','5_estrellas'].includes(game.formato));
}

export function openFixedPlayForm({
  season,
  games,
  fixedPlay=null,
  onSave
}) {
  const editing=Boolean(fixedPlay);
  const available=supportedGames(games);
  const initialGame=available.find((game)=>game.codigo===fixedPlay?.juego_codigo) || available[0];

  const modal=openModal({
    title:editing?'Editar jugada fija':'Nueva jugada fija',
    subtitle:`TEMPORADA ${season.anio}`,
    content:`
      <form id="fixedPlayForm" class="admin-form">
        <div class="admin-form-grid">
          <div class="admin-form-field">
            <label for="fixed-play-name">Nombre *</label>
            <input id="fixed-play-name" name="nombre" type="text"
              value="${esc(fixedPlay?.nombre || '')}"
              placeholder="Ej. Combinaciones Fijas Peña Outra Máis" required />
          </div>

          <div class="admin-form-field">
            <label for="fixed-play-game">Juego *</label>
            <select id="fixed-play-game" name="juego_codigo" ${editing?'disabled':''} required>
              ${available.map((game)=>`
                <option value="${esc(game.codigo)}" ${game.codigo===initialGame?.codigo?'selected':''}>
                  ${esc(game.nombre)}
                </option>
              `).join('')}
            </select>
          </div>

          <label class="admin-check-row admin-form-wide">
            <input name="activa" type="checkbox" ${fixedPlay?.activa===false?'':'checked'} />
            <span>
              <strong>Jugada activa</strong>
              <small>Solo las jugadas activas pueden utilizarse en nuevas programaciones.</small>
            </span>
          </label>

          <div class="admin-form-field admin-form-wide">
            <label for="fixed-play-notes">Observaciones</label>
            <textarea id="fixed-play-notes" name="observaciones" rows="2">${esc(fixedPlay?.observaciones || '')}</textarea>
          </div>
        </div>
        <div id="fixedPlayFormError" class="admin-error"></div>
      </form>
    `,
    actions:`
      <button class="admin-action secondary" type="button" data-modal-close>Cancelar</button>
      <button class="admin-action" type="submit" form="fixedPlayForm" id="fixedPlaySave">
        ${editing?'Guardar cambios':'Crear jugada'}
      </button>
    `
  });

  const form=modal.querySelector('#fixedPlayForm');
  const save=modal.querySelector('#fixedPlaySave');
  const errorBox=modal.querySelector('#fixedPlayFormError');

  form.addEventListener('submit',async(event)=>{
    event.preventDefault();
    errorBox.classList.remove('visible');
    save.disabled=true;
    save.textContent='Guardando…';

    try {
      const data=new FormData(form);
      const name=String(data.get('nombre') || '').trim();
      if (!name) throw new Error('Escribe un nombre para la jugada fija.');

      await onSave({
        temporada_id:season.id,
        nombre:name,
        juego_codigo:editing ? fixedPlay.juego_codigo : String(data.get('juego_codigo')),
        activa:data.get('activa')==='on',
        observaciones:String(data.get('observaciones') || '').trim() || null
      });
      closeModal();
    } catch(error) {
      errorBox.textContent=error?.message || 'No se pudo guardar la jugada.';
      errorBox.classList.add('visible');
      save.disabled=false;
      save.textContent=editing?'Guardar cambios':'Crear jugada';
    }
  });
}

function numberFields(prefix,count,min,max,values=[],label='Nº') {
  return `
    <div class="number-input-grid ${count===5?'five':''}">
      ${Array.from({length:count},(_,i)=>`
        <div class="admin-form-field number-field">
          <label>${label} ${i+1} *</label>
          <input name="${prefix}_${i+1}" type="number"
            min="${min}" max="${max}" step="1" inputmode="numeric"
            value="${esc(values[i] ?? '')}" required />
        </div>
      `).join('')}
    </div>
  `;
}

function readList(data,prefix,count,min,max,label) {
  const values=Array.from({length:count},(_,i)=>Number(data.get(`${prefix}_${i+1}`)));
  if (values.some((n)=>!Number.isInteger(n) || n<min || n>max)) {
    throw new Error(`Los ${label} deben estar entre ${min} y ${max}.`);
  }
  if (new Set(values).size!==values.length) {
    throw new Error(`No puede haber ${label.toLowerCase()} repetidos.`);
  }
  return values.sort((a,b)=>a-b);
}

export function openCombinationForm({
  season,
  fixedPlay,
  game,
  combinations,
  combination=null,
  onSave
}) {
  const editing=Boolean(combination);
  const groupRows=combinations.filter((row)=>String(row.jugada_fija_id)===String(fixedPlay.id));
  const nextOrder=groupRows.length
    ? Math.max(...groupRows.map((row)=>Number(row.numero_orden)))+1
    : 1;

  const config=game?.config || {};
  const isEuro=game?.formato==='5_estrellas';
  const numberCount=Number(config.cantidad_numeros || (isEuro?5:6));
  const maxNumber=Number(config.max_numero || (isEuro?50:49));
  const starCount=Number(config.cantidad_estrellas || 0);
  const maxStar=Number(config.max_estrella || 12);

  const modal=openModal({
    title:editing?'Editar combinación':'Nueva combinación',
    subtitle:`${game?.nombre || fixedPlay.juego_codigo} · ${fixedPlay.nombre}`,
    content:`
      <form id="combinationForm" class="admin-form">
        <div class="admin-form-grid">
          <div class="admin-form-field">
            <label for="comb-order">Orden *</label>
            <input id="comb-order" name="numero_orden" type="number" min="1" max="99"
              value="${esc(combination?.numero_orden ?? nextOrder)}" required />
          </div>

          <div class="admin-form-field">
            <label for="comb-name">Nombre</label>
            <input id="comb-name" name="nombre" type="text"
              value="${esc(combination?.nombre || '')}"
              placeholder="Ej. Combinación I" />
          </div>

          <div class="admin-form-wide">
            <p class="admin-form-subtitle">Números</p>
            ${numberFields('numero',numberCount,1,maxNumber,combination?.numeros || [])}
          </div>

          ${starCount ? `
            <div class="admin-form-wide">
              <p class="admin-form-subtitle">Estrellas</p>
              ${numberFields('estrella',starCount,1,maxStar,combination?.estrellas || [],'Estrella')}
            </div>
          ` : ''}

          <label class="admin-check-row admin-form-wide">
            <input name="activa" type="checkbox" ${combination?.activa===false?'':'checked'} />
            <span>
              <strong>Combinación activa</strong>
              <small>Solo las combinaciones activas se incluirán cuando se programe esta jugada fija.</small>
            </span>
          </label>
        </div>

        <p class="admin-form-help">
          El orden solo tiene que ser único dentro de “${esc(fixedPlay.nombre)}”.
        </p>
        <div id="combinationFormError" class="admin-error"></div>
      </form>
    `,
    actions:`
      <button class="admin-action secondary" type="button" data-modal-close>Cancelar</button>
      <button class="admin-action" type="submit" form="combinationForm" id="combinationSave">
        ${editing?'Guardar cambios':'Crear combinación'}
      </button>
    `
  });

  const form=modal.querySelector('#combinationForm');
  const save=modal.querySelector('#combinationSave');
  const errorBox=modal.querySelector('#combinationFormError');

  form.addEventListener('submit',async(event)=>{
    event.preventDefault();
    errorBox.classList.remove('visible');
    save.disabled=true;
    save.textContent='Guardando…';

    try {
      const data=new FormData(form);
      const order=Number(data.get('numero_orden'));

      if (!Number.isInteger(order) || order<1 || order>99) {
        throw new Error('El orden debe ser un número entre 1 y 99.');
      }

      if (groupRows.some((row)=>
        Number(row.numero_orden)===order &&
        String(row.id)!==String(combination?.id || '')
      )) {
        throw new Error('Ya existe otra combinación con ese número de orden en esta jugada.');
      }

      const payload={
        temporada_id:season.id,
        jugada_fija_id:fixedPlay.id,
        juego_codigo:fixedPlay.juego_codigo,
        numero_orden:order,
        nombre:String(data.get('nombre') || '').trim() || `Combinación ${order}`,
        numeros:readList(data,'numero',numberCount,1,maxNumber,'números'),
        estrellas:starCount
          ? readList(data,'estrella',starCount,1,maxStar,'estrellas')
          : [],
        activa:data.get('activa')==='on'
      };

      await onSave(payload);
      closeModal();
    } catch(error) {
      errorBox.textContent=error?.message || 'No se pudo guardar la combinación.';
      errorBox.classList.add('visible');
      save.disabled=false;
      save.textContent=editing?'Guardar cambios':'Crear combinación';
    }
  });
}
