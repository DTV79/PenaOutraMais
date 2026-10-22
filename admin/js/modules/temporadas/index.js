import { bootstrapAdmin } from '../../app/bootstrap.js';
import { confirmModal, openModal } from '../../ui/modal.js';
import {
  getSeasonsSnapshot,
  createPreparedSeason,
  activateSeason
} from './service.js?v=20261022-10';
import { renderSeasons } from './list.js?v=20261022-11';
import { openSeasonForm } from './form.js?v=20261022-02';

let snapshot=null;

function showError(title,error) {
  openModal({
    title,
    content:`<div class="admin-error visible">${error?.message || error}</div>`,
    actions:'<button class="admin-action" type="button" data-modal-close>Cerrar</button>'
  });
}

async function refresh() {
  const container=document.querySelector('#seasonsAdmin');

  try {
    snapshot=await getSeasonsSnapshot();
    renderSeasons(snapshot,{
      onActivate:activatePreparedSeason
    });
  } catch(error) {
    container.innerHTML=`<div class="admin-error visible">${error.message}</div>`;
  }
}

async function activatePreparedSeason(id) {
  const season=snapshot?.seasons.find((row)=>String(row.id)===String(id));
  if (!season) return;

  const confirmed=await confirmModal({
    title:`Activar temporada ${season.anio}`,
    message:`Al activar ${season.anio}, la temporada actual se cerrará, el saldo final del bote pasará como arrastre y los saldos adelantados para ${season.anio} se aplicarán automáticamente. ¿Continuar?`,
    confirmText:'Activar temporada',
    danger:true
  });

  if (!confirmed) return;

  try {
    await activateSeason(season.id);
    await refresh();
  } catch(error) {
    showError('No se pudo activar la temporada',error);
  }
}

async function init() {
  if (!await bootstrapAdmin()) return;

  document.querySelector('#newSeasonButton')?.addEventListener('click',()=>{
    const active=snapshot?.seasons.find((row)=>row.activa);
    if (!active) return;

    openSeasonForm({
      activeSeason:active,
      onSave:async(payload)=>{
        await createPreparedSeason(payload);
        await refresh();
      }
    });
  });

  await refresh();
}

init();
