import { bootstrapAdmin } from '../../app/bootstrap.js';
import { confirmModal, openModal } from '../../ui/modal.js';
import {
  getNumbersSnapshot,
  createCombination,
  updateCombination,
  setCombinationActive
} from './service.js';
import { renderNumbersSnapshot } from './list.js';
import { openCombinationForm } from './form.js';

let snapshot = null;
const container = document.querySelector('#numbersAdmin');

async function refresh() {
  container.className = 'admin-loading';
  container.textContent = 'Cargando números…';

  try {
    snapshot = await getNumbersSnapshot();
    container.className = 'number-admin-list';
    renderNumbersSnapshot(snapshot);
  } catch (error) {
    container.className = '';
    container.innerHTML = `<div class="admin-error visible">${error.message}</div>`;
  }
}

function openCreate() {
  if (!snapshot?.season) return;

  openCombinationForm({
    season: snapshot.season,
    combinations: snapshot.combinations,
    onSave: async (payload) => {
      await createCombination(payload);
      await refresh();
    }
  });
}

function openEdit(id) {
  const combination = snapshot?.combinations.find(
    (row) => String(row.id) === String(id)
  );

  if (!combination) return;

  openCombinationForm({
    season: snapshot.season,
    combinations: snapshot.combinations,
    combination,
    onSave: async (payload) => {
      await updateCombination(id, payload);
      await refresh();
    }
  });
}

async function toggleCombination(id, active) {
  const combination = snapshot?.combinations.find(
    (row) => String(row.id) === String(id)
  );

  if (!combination) return;

  const confirmed = await confirmModal({
    title: active ? 'Desactivar combinación' : 'Reactivar combinación',
    message: active
      ? `¿Quieres ocultar “${combination.nombre}” de la web pública?`
      : `¿Quieres volver a activar “${combination.nombre}”?`,
    confirmText: active ? 'Desactivar' : 'Reactivar',
    danger: active
  });

  if (!confirmed) return;

  try {
    await setCombinationActive(id, !active);
    await refresh();
  } catch (error) {
    openModal({
      title: 'No se pudo actualizar',
      content: `<div class="admin-error visible">${error.message}</div>`,
      actions: '<button class="admin-action" type="button" data-modal-close>Cerrar</button>'
    });
  }
}

async function init() {
  if (!await bootstrapAdmin()) return;

  document.querySelector('#newCombinationButton')
    ?.addEventListener('click', openCreate);

  container.addEventListener('click', (event) => {
    const edit = event.target.closest('[data-combination-edit]');
    if (edit) {
      openEdit(edit.dataset.combinationEdit);
      return;
    }

    const toggle = event.target.closest('[data-combination-toggle]');
    if (toggle) {
      toggleCombination(
        toggle.dataset.combinationToggle,
        toggle.dataset.combinationActive === 'true'
      );
    }
  });

  await refresh();
}

init();
