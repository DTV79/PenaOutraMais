import { bootstrapAdmin } from '../../app/bootstrap.js';
import { confirmModal, openModal } from '../../ui/modal.js';
import {
  getNumbersSnapshot,
  createFixedPlay,
  updateFixedPlay,
  setFixedPlayActive,
  createCombination,
  updateCombination,
  setCombinationActive,
  refreshScheduledDraws
} from './service.js?v=20261022-06';
import {
  openFixedPlayForm,
  openCombinationForm
} from './form.js?v=20261022-06';
import { renderNumbersSnapshot } from './list.js?v=20261022-06';

let snapshot=null;
const container=document.querySelector('#numbersAdmin');

function showError(title,error) {
  openModal({
    title,
    content:`<div class="admin-error visible">${error?.message || error}</div>`,
    actions:'<button class="admin-action" type="button" data-modal-close>Cerrar</button>'
  });
}

async function refresh() {
  container.className='admin-loading';
  container.textContent='Cargando jugadas fijas…';

  try {
    snapshot=await getNumbersSnapshot();
    container.className='';
    renderNumbersSnapshot(snapshot);
  } catch(error) {
    container.className='';
    container.innerHTML=`<div class="admin-error visible">${error.message}</div>`;
  }
}

async function syncAndRefresh() {
  await refreshScheduledDraws();
  await refresh();
}

function openCreateFixedPlay() {
  if (!snapshot?.season) return;

  openFixedPlayForm({
    season:snapshot.season,
    games:snapshot.games,
    onSave:async(payload)=>{
      await createFixedPlay(payload);
      await refresh();
    }
  });
}

function openEditFixedPlay(id) {
  const fixedPlay=snapshot?.fixedPlays.find((row)=>String(row.id)===String(id));
  if (!fixedPlay) return;

  openFixedPlayForm({
    season:snapshot.season,
    games:snapshot.games,
    fixedPlay,
    onSave:async(payload)=>{
      const update={...payload};
      delete update.temporada_id;
      delete update.juego_codigo;
      await updateFixedPlay(id,update);
      await syncAndRefresh();
    }
  });
}

function openCreateCombination(fixedPlayId) {
  const fixedPlay=snapshot?.fixedPlays.find((row)=>String(row.id)===String(fixedPlayId));
  if (!fixedPlay) return;
  const game=snapshot.games.find((row)=>row.codigo===fixedPlay.juego_codigo);

  openCombinationForm({
    season:snapshot.season,
    fixedPlay,
    game,
    combinations:snapshot.combinations,
    onSave:async(payload)=>{
      await createCombination(payload);
      await syncAndRefresh();
    }
  });
}

function openEditCombination(id) {
  const combination=snapshot?.combinations.find((row)=>String(row.id)===String(id));
  if (!combination) return;
  const fixedPlay=snapshot.fixedPlays.find((row)=>String(row.id)===String(combination.jugada_fija_id));
  const game=snapshot.games.find((row)=>row.codigo===combination.juego_codigo);
  if (!fixedPlay) return;

  openCombinationForm({
    season:snapshot.season,
    fixedPlay,
    game,
    combinations:snapshot.combinations,
    combination,
    onSave:async(payload)=>{
      const update={...payload};
      delete update.temporada_id;
      delete update.jugada_fija_id;
      delete update.juego_codigo;
      await updateCombination(id,update);
      await syncAndRefresh();
    }
  });
}

async function toggleFixedPlay(id,active) {
  const fixedPlay=snapshot?.fixedPlays.find((row)=>String(row.id)===String(id));
  if (!fixedPlay) return;

  const confirmed=await confirmModal({
    title:active?'Desactivar jugada fija':'Reactivar jugada fija',
    message:active
      ? `¿Quieres desactivar “${fixedPlay.nombre}”? Las programaciones que la utilicen también quedarán desactivadas.`
      : `¿Quieres volver a activar “${fixedPlay.nombre}”? Las programaciones no se reactivarán automáticamente.`,
    confirmText:active?'Desactivar':'Reactivar',
    danger:active
  });
  if (!confirmed) return;

  try {
    await setFixedPlayActive(id,!active);
    await syncAndRefresh();
  } catch(error) {
    showError('No se pudo actualizar la jugada',error);
  }
}

async function toggleCombination(id,active) {
  const combination=snapshot?.combinations.find((row)=>String(row.id)===String(id));
  if (!combination) return;

  const confirmed=await confirmModal({
    title:active?'Desactivar combinación':'Reactivar combinación',
    message:active
      ? `¿Quieres dejar de incluir “${combination.nombre}” en esta jugada fija?`
      : `¿Quieres volver a incluir “${combination.nombre}”?`,
    confirmText:active?'Desactivar':'Reactivar',
    danger:active
  });
  if (!confirmed) return;

  try {
    await setCombinationActive(id,!active);
    await syncAndRefresh();
  } catch(error) {
    showError('No se pudo actualizar la combinación',error);
  }
}

async function init() {
  if (!await bootstrapAdmin()) return;

  document.querySelector('#newFixedPlayButton')
    ?.addEventListener('click',openCreateFixedPlay);

  container.addEventListener('click',(event)=>{
    const editPlay=event.target.closest('[data-fixed-play-edit]');
    if (editPlay) {
      openEditFixedPlay(editPlay.dataset.fixedPlayEdit);
      return;
    }

    const togglePlay=event.target.closest('[data-fixed-play-toggle]');
    if (togglePlay) {
      toggleFixedPlay(
        togglePlay.dataset.fixedPlayToggle,
        togglePlay.dataset.fixedPlayActive==='true'
      );
      return;
    }

    const addCombination=event.target.closest('[data-combination-add]');
    if (addCombination) {
      openCreateCombination(addCombination.dataset.combinationAdd);
      return;
    }

    const editCombination=event.target.closest('[data-combination-edit]');
    if (editCombination) {
      openEditCombination(editCombination.dataset.combinationEdit);
      return;
    }

    const toggleCombinationButton=event.target.closest('[data-combination-toggle]');
    if (toggleCombinationButton) {
      toggleCombination(
        toggleCombinationButton.dataset.combinationToggle,
        toggleCombinationButton.dataset.combinationActive==='true'
      );
    }
  });

  await refresh();
}

init();
