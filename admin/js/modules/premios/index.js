import { bootstrapAdmin } from '../../app/bootstrap.js';
import { confirmModal, openModal } from '../../ui/modal.js';
import {
  getAwardsSnapshot,
  createBoteMovement,
  updateBoteMovement,
  cancelBoteMovement
} from './service.js';
import { openBoteForm } from './form.js';
import { renderAwardsSummary } from './summary.js';
import { renderBoteMovements } from './list.js';

let snapshot=null;

async function refresh() {
  try {
    snapshot=await getAwardsSnapshot();
    renderAwardsSummary(snapshot);
    renderBoteMovements(snapshot.movements);
  } catch (error) {
    document.querySelector('#awardsMovements').innerHTML =
      `<div class="admin-error visible">${error.message}</div>`;
  }
}

function openCreate() {
  if (!snapshot?.season) return;

  openBoteForm({
    season:snapshot.season,
    movements:snapshot.movements,
    onSave:async (payload) => {
      await createBoteMovement(payload);
      await refresh();
    }
  });
}

function openEdit(id) {
  const movement=snapshot?.movements.find((row) => String(row.id)===String(id));
  if (!movement || movement.anulado_at) return;

  openBoteForm({
    season:snapshot.season,
    movements:snapshot.movements,
    movement,
    onSave:async (payload) => {
      await updateBoteMovement(id,payload);
      await refresh();
    }
  });
}

async function cancelMovement(id) {
  const movement=snapshot?.movements.find((row) => String(row.id)===String(id));
  if (!movement || movement.anulado_at) return;

  const confirmed=await confirmModal({
    title:'Anular movimiento',
    message:`¿Quieres anular “${movement.concepto}”? Se conservará en el histórico y dejará de afectar al bote.`,
    confirmText:'Anular',
    danger:true
  });
  if (!confirmed) return;

  try {
    await cancelBoteMovement(id);
    await refresh();
  } catch (error) {
    openModal({
      title:'No se pudo anular',
      content:`<div class="admin-error visible">${error.message}</div>`,
      actions:'<button class="admin-action" type="button" data-modal-close>Cerrar</button>'
    });
  }
}

async function init() {
  if (!await bootstrapAdmin()) return;

  document.querySelector('#newBoteMovementButton')?.addEventListener('click',openCreate);

  document.querySelector('#awardsMovements').addEventListener('click',(event) => {
    const edit=event.target.closest('[data-award-edit]');
    if (edit) {
      openEdit(edit.dataset.awardEdit);
      return;
    }

    const cancel=event.target.closest('[data-award-cancel]');
    if (cancel) cancelMovement(cancel.dataset.awardCancel);
  });

  await refresh();
}

init();
