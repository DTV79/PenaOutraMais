import { openModal, closeModal } from '../../ui/modal.js';

function esc(value='') {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&','&amp;')
    .replaceAll('"','&quot;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
}

function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0,10);
}

function numberGrid(prefix, count, min, max, label='Nº') {
  return `
    <div class="bet-number-grid ${count === 5 ? 'five' : ''}">
      ${Array.from({length:count},(_,i)=>`
        <div class="admin-form-field bet-number-field">
          <label>${label} ${i+1}</label>
          <input name="${prefix}_${i+1}" type="number" min="${min}" max="${max}"
            step="1" inputmode="numeric" required />
        </div>
      `).join('')}
    </div>
  `;
}

function readIntegerList(data, prefix, count, min, max) {
  const values = Array.from({length:count},(_,i)=>Number(data.get(`${prefix}_${i+1}`)));
  if (values.some((n)=>!Number.isInteger(n) || n < min || n > max)) {
    throw new Error(`Completa todos los valores entre ${min} y ${max}.`);
  }
  if (new Set(values).size !== values.length) {
    throw new Error('No puede haber números repetidos.');
  }
  return values.sort((a,b)=>a-b);
}

export function openFixedDrawForm({ season, combinationCount, onSave }) {
  const modal = openModal({
    title:'Registrar sorteo habitual',
    subtitle:`LA PRIMITIVA · ${season.anio}`,
    content:`
      <form id="fixedDrawForm" class="admin-form">
        <div class="admin-form-grid">
          <div class="admin-form-field">
            <label for="fixed-date">Fecha del sorteo *</label>
            <input id="fixed-date" name="fecha" type="date" value="${todayIso()}" required />
          </div>
          <div class="admin-form-field">
            <label for="fixed-amount">Importe total del sorteo</label>
            <input id="fixed-amount" name="importe" type="number" min="0" step="0.01"
              value="${combinationCount || 0}" />
            <small id="fixedAmountHelp" class="field-note"></small>
          </div>
          <div class="admin-form-field admin-form-wide">
            <p class="admin-form-help sorteo-help">
              Se copiarán automáticamente las ${combinationCount} combinaciones activas de La Primitiva. Después podrás indicar el reintegro correspondiente a cada combinación/resguardo.
            </p>
          </div>
        </div>
        <div id="fixedDrawError" class="admin-error"></div>
      </form>
    `,
    actions:`
      <button class="admin-action secondary" type="button" data-modal-close>Cancelar</button>
      <button class="admin-action" type="submit" form="fixedDrawForm" id="fixedDrawSave">Registrar</button>
    `
  });

  const form=modal.querySelector('#fixedDrawForm');
  const errorBox=modal.querySelector('#fixedDrawError');
  const save=modal.querySelector('#fixedDrawSave');
  const amountInput=modal.querySelector('#fixed-amount');
  const amountHelp=modal.querySelector('#fixedAmountHelp');

  function updateAmountHelp() {
    const total=Number(amountInput.value || 0);
    const perBet=combinationCount ? total / combinationCount : 0;
    amountHelp.textContent=combinationCount
      ? combinationCount + ' combinaciones · ' +
        perBet.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}) +
        ' € por combinación'
      : 'No hay combinaciones activas.';
  }

  amountInput.addEventListener('input',updateAmountHelp);
  updateAmountHelp();

  form.addEventListener('submit',async(event)=>{
    event.preventDefault();
    save.disabled=true;
    save.textContent='Guardando…';
    errorBox.classList.remove('visible');
    try {
      const data=new FormData(form);
      await onSave({
        date:String(data.get('fecha')),
        totalAmount:Number(data.get('importe') || 0),
        combinationCount
      });
      closeModal();
    } catch(error) {
      errorBox.textContent=error?.message || 'No se pudo registrar el sorteo.';
      errorBox.classList.add('visible');
      save.disabled=false;
      save.textContent='Registrar';
    }
  });
}

function fieldsForGame(game) {
  if (game.formato === '5_estrellas') {
    return `
      <div class="admin-form-wide">
        <p class="admin-form-subtitle">Números</p>
        ${numberGrid('numero',5,1,50)}
      </div>
      <div class="admin-form-wide">
        <p class="admin-form-subtitle">Estrellas</p>
        ${numberGrid('estrella',2,1,12,'Estrella')}
      </div>
      <div class="admin-form-field admin-form-wide">
        <label for="special-million">Código El Millón</label>
        <input id="special-million" name="codigo_millon" type="text" maxlength="8"
          placeholder="Ej. ABC12345" />
        <small class="field-note">Es necesario para que la comprobación de Euromillones pueda considerarse completa.</small>
      </div>
    `;
  }

  if (game.formato === 'decimo') {
    return `
      <div class="admin-form-field">
        <label for="special-number">Número del décimo *</label>
        <input id="special-number" name="numero_decimo" type="text" inputmode="numeric"
          maxlength="5" pattern="[0-9]{5}" placeholder="00000" required />
      </div>
      <div class="admin-form-field">
        <label for="special-quantity">Décimos / participaciones</label>
        <input id="special-quantity" name="cantidad" type="number" min="1" step="1" value="1" />
      </div>
      <div class="admin-form-field">
        <label for="special-series">Serie</label>
        <input id="special-series" name="serie" type="text" />
      </div>
      <div class="admin-form-field">
        <label for="special-fraction">Fracción</label>
        <input id="special-fraction" name="fraccion" type="text" />
      </div>
      <div class="admin-form-field admin-form-wide">
        <p class="admin-form-help sorteo-warning">
          Lotería Nacional/Navidad se contrastará con SELAE, pero los premios derivados, aproximaciones, terminaciones y pedreas requieren revisión antes de incorporarlos al bote.
        </p>
      </div>
    `;
  }

  return `
    <div class="admin-form-wide">
      <p class="admin-form-subtitle">Números</p>
      ${numberGrid('numero',6,1,49)}
    </div>
    <div class="admin-form-field">
      <label for="special-refund">Reintegro</label>
      <input id="special-refund" name="reintegro" type="number" min="0" max="9" step="1" />
    </div>
  `;
}

export function openSpecialBetForm({ season, games, onSave }) {
  const modal=openModal({
    title:'Nueva apuesta especial',
    subtitle:`TEMPORADA ${season.anio}`,
    content:`
      <form id="specialBetForm" class="admin-form">
        <div class="admin-form-grid">
          <div class="admin-form-field">
            <label for="special-game">Juego *</label>
            <select id="special-game" name="juego" required>
              ${games.map((game)=>`<option value="${esc(game.codigo)}">${esc(game.nombre)}</option>`).join('')}
            </select>
          </div>
          <div class="admin-form-field">
            <label for="special-date">Fecha del sorteo *</label>
            <input id="special-date" name="fecha" type="date" value="${todayIso()}" required />
          </div>
          <div class="admin-form-field admin-form-wide">
            <label for="special-draw-name">Nombre del sorteo</label>
            <input id="special-draw-name" name="nombre_sorteo" type="text"
              placeholder="Ej. Sorteo de Navidad" />
          </div>
          <div class="admin-form-field">
            <label for="special-description">Descripción</label>
            <input id="special-description" name="descripcion" type="text"
              placeholder="Ej. Décimo compartido" />
          </div>
          <div class="admin-form-field">
            <label for="special-amount">Importe jugado</label>
            <input id="special-amount" name="importe" type="number" min="0" step="0.01" value="0" />
          </div>
          <div id="specialGameFields" class="admin-form-wide"></div>
        </div>
        <div id="specialBetError" class="admin-error"></div>
      </form>
    `,
    actions:`
      <button class="admin-action secondary" type="button" data-modal-close>Cancelar</button>
      <button class="admin-action" type="submit" form="specialBetForm" id="specialBetSave">Guardar apuesta</button>
    `
  });

  const form=modal.querySelector('#specialBetForm');
  const gameSelect=modal.querySelector('#special-game');
  const fields=modal.querySelector('#specialGameFields');
  const errorBox=modal.querySelector('#specialBetError');
  const save=modal.querySelector('#specialBetSave');

  function selectedGame() {
    return games.find((game)=>game.codigo===gameSelect.value) || games[0];
  }

  function renderFields() {
    fields.innerHTML=fieldsForGame(selectedGame());
  }

  gameSelect.addEventListener('change',renderFields);
  renderFields();

  form.addEventListener('submit',async(event)=>{
    event.preventDefault();
    save.disabled=true;
    save.textContent='Guardando…';
    errorBox.classList.remove('visible');

    try {
      const data=new FormData(form);
      const game=selectedGame();
      let betData;

      if (game.formato === '5_estrellas') {
        betData={
          numeros:readIntegerList(data,'numero',5,1,50),
          estrellas:readIntegerList(data,'estrella',2,1,12),
          codigo_millon:String(data.get('codigo_millon') || '').trim().toUpperCase() || null
        };
      } else if (game.formato === 'decimo') {
        const number=String(data.get('numero_decimo') || '').trim();
        if (!/^\d{5}$/.test(number)) throw new Error('El número del décimo debe tener exactamente 5 cifras.');
        betData={
          numero:number,
          cantidad:Math.max(1,Number(data.get('cantidad') || 1)),
          serie:String(data.get('serie') || '').trim() || null,
          fraccion:String(data.get('fraccion') || '').trim() || null
        };
      } else {
        const refund=String(data.get('reintegro') || '');
        betData={
          numeros:readIntegerList(data,'numero',6,1,49),
          reintegro:refund === '' ? null : Number(refund)
        };
      }

      await onSave({
        season,
        gameCode:game.codigo,
        date:String(data.get('fecha')),
        drawName:String(data.get('nombre_sorteo') || '').trim() || null,
        description:String(data.get('descripcion') || '').trim() || null,
        amount:Number(data.get('importe') || 0),
        data:betData
      });
      closeModal();
    } catch(error) {
      errorBox.textContent=error?.message || 'No se pudo guardar la apuesta.';
      errorBox.classList.add('visible');
      save.disabled=false;
      save.textContent='Guardar apuesta';
    }
  });
}


export function openRefundForm({ draw, bets, onSave }) {
  const fixedBets = bets.filter(
    (bet) => Number(bet.sorteo_id) === Number(draw.id) && bet.tipo === 'fija'
  );

  const modal = openModal({
    title:'Reintegros',
    subtitle:`LA PRIMITIVA · ${draw.fecha.split('-').reverse().join('/')}`,
    content:`
      <form id="refundForm" class="admin-form">
        <div class="refund-bet-list">
          ${fixedBets.map((bet)=>`
            <div class="refund-bet-row">
              <div>
                <strong>${esc(bet.descripcion || 'Combinación')}</strong>
                <small>${(bet.datos?.numeros || []).join(' · ')}</small>
              </div>
              <div class="admin-form-field">
                <label>R</label>
                <input name="refund_${bet.id}" type="number" min="0" max="9" step="1"
                  value="${bet.datos?.reintegro ?? ''}" />
              </div>
            </div>
          `).join('')}
        </div>
        <p class="admin-form-help">
          Pon el reintegro que figure para cada apuesta/resguardo. Puedes dejar una combinación vacía si todavía no lo sabes.
        </p>
        <div id="refundError" class="admin-error"></div>
      </form>
    `,
    actions:`
      <button class="admin-action secondary" type="button" data-modal-close>Cancelar</button>
      <button class="admin-action" type="submit" form="refundForm" id="refundSave">Guardar</button>
    `
  });

  const formEl=modal.querySelector('#refundForm');
  const errorBox=modal.querySelector('#refundError');
  const save=modal.querySelector('#refundSave');

  formEl.addEventListener('submit',async(event)=>{
    event.preventDefault();
    const data=new FormData(formEl);
    const refunds={};

    for (const bet of fixedBets) {
      const raw=String(data.get(`refund_${bet.id}`) ?? '').trim();
      if (raw !== '') {
        const value=Number(raw);
        if (!Number.isInteger(value) || value < 0 || value > 9) {
          errorBox.textContent='Todos los reintegros deben estar entre 0 y 9.';
          errorBox.classList.add('visible');
          return;
        }
        refunds[String(bet.id)]=value;
      } else {
        refunds[String(bet.id)]='';
      }
    }

    save.disabled=true;
    save.textContent='Guardando…';

    try {
      await onSave(refunds);
      closeModal();
    } catch(error) {
      errorBox.textContent=error?.message || 'No se pudieron guardar los reintegros.';
      errorBox.classList.add('visible');
      save.disabled=false;
      save.textContent='Guardar';
    }
  });
}
