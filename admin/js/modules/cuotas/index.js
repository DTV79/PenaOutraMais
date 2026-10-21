import { bootstrapAdmin } from '../../app/bootstrap.js';
import { confirmModal, openModal } from '../../ui/modal.js';
import {
  getQuotaSnapshot,
  createQuotaMovement,
  updateQuotaMovement,
  cancelQuotaMovement
} from './service.js?v=20261021-5';
import { renderQuotaSnapshot } from './list.js?v=20261021-5';
import { openQuotaForm } from './form.js?v=20261021-5';

let snapshot = null;
const container = document.querySelector('#feesAdmin');

async function refresh() {
  try {
    snapshot = await getQuotaSnapshot();
    renderQuotaSnapshot(snapshot);
  } catch (error) {
    container.innerHTML = `<div class="admin-error visible">${error.message}</div>`;
  }
}

function openCreate() {
  if (!snapshot?.season) return;

  openQuotaForm({
    members: snapshot.members,
    season: snapshot.season,
    onSave: async (payload) => {
      await createQuotaMovement(payload);
      await refresh();
    }
  });
}

function openEdit(id) {
  const movement = snapshot?.movements.find((row) => String(row.id) === String(id));
  if (!movement || movement.anulado_at) return;

  openQuotaForm({
    members: snapshot.members,
    season: snapshot.season,
    movement,
    onSave: async (payload) => {
      await updateQuotaMovement(id, payload);
      await refresh();
    }
  });
}

async function cancelMovement(id) {
  const movement = snapshot?.movements.find((row) => String(row.id) === String(id));
  if (!movement || movement.anulado_at) return;

  const member = snapshot.members.find((row) => row.id === movement.socio_id);
  const confirmed = await confirmModal({
    title: 'Anular movimiento',
    message: `¿Quieres anular este movimiento de ${member?.alias || 'este socio'}? Se conservará en el histórico.`,
    confirmText: 'Anular',
    danger: true
  });

  if (!confirmed) return;

  try {
    await cancelQuotaMovement(id);
    await refresh();
  } catch (error) {
    openModal({
      title: 'No se pudo anular',
      content: `<div class="admin-error visible">${error.message}</div>`,
      actions: '<button class="admin-action" type="button" data-modal-close>Cerrar</button>'
    });
  }
}

async function init() {
  if (!await bootstrapAdmin()) return;

  document.querySelector('#newQuotaMovementButton')
    ?.addEventListener('click', openCreate);

  container.addEventListener('click', (event) => {
    const edit = event.target.closest('[data-quota-edit]');
    if (edit) {
      openEdit(edit.dataset.quotaEdit);
      return;
    }

    const cancel = event.target.closest('[data-quota-cancel]');
    if (cancel) {
      cancelMovement(cancel.dataset.quotaCancel);
    }
  });

  await refresh();
}

init();
