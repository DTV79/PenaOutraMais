import { bootstrapAdmin } from '../../app/bootstrap.js?v=20261022-24';
import { confirmModal, openModal } from '../../ui/modal.js';
import {
  getAwardsSnapshot,
  createBoteMovement,
  updateBoteMovement,
  cancelBoteMovement,
  deleteBoteMovement
} from './service.js?v=20261021-31';
import { openBoteForm } from './form.js?v=20261021-31';
import { renderAwardsSummary } from './summary.js?v=20261022-02';
import { renderBoteMovements } from './list.js?v=20261022-33';

let snapshot=null;

function activateAwardTab(name) {
  document.querySelectorAll('[data-award-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.awardTab === name);
  });

  document.querySelectorAll('[data-award-panel]').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.awardPanel === name);
  });
}

function setupAwardTabs() {
  document.querySelectorAll('[data-award-tab]').forEach((button) => {
    button.addEventListener('click', () => activateAwardTab(button.dataset.awardTab));
  });
}

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

async function deleteMovement(id) {
  const movement=snapshot?.movements.find((row) => String(row.id)===String(id));
  if (!movement || !movement.anulado_at) return;

  const confirmed=await confirmModal({
    title:'Eliminar movimiento',
    message:`¿Quieres eliminar definitivamente “${movement.concepto}”? Esta acción no se puede deshacer.`,
    confirmText:'Eliminar',
    danger:true
  });

  if (!confirmed) return;

  try {
    await deleteBoteMovement(id);
    await refresh();
  } catch (error) {
    openModal({
      title:'No se pudo eliminar',
      content:`<div class="admin-error visible">${error.message}</div>`,
      actions:'<button class="admin-action" type="button" data-modal-close>Cerrar</button>'
    });
  }
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

  setupAwardTabs();

  document.querySelector('#newBoteMovementButton')?.addEventListener('click',openCreate);

  document.querySelector('#awardsMovements').addEventListener('click',(event) => {
    const edit=event.target.closest('[data-award-edit]');
    if (edit) {
      openEdit(edit.dataset.awardEdit);
      return;
    }

    const cancel=event.target.closest('[data-award-cancel]');
    if (cancel) {
      cancelMovement(cancel.dataset.awardCancel);
      return;
    }

    const remove=event.target.closest('[data-award-delete]');
    if (remove) deleteMovement(remove.dataset.awardDelete);
  });

  await refresh();
}

init();
