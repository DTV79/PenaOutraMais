import { bootstrapAdmin } from '../../app/bootstrap.js';
import { getQuotaSnapshot } from './service.js';
import { renderQuotaSnapshot } from './list.js';

async function init() {
  if (!await bootstrapAdmin()) return;

  const container = document.querySelector('#feesAdmin');

  try {
    const snapshot = await getQuotaSnapshot();
    renderQuotaSnapshot(snapshot);
  } catch (error) {
    container.innerHTML = `<div class="admin-error visible">${error.message}</div>`;
  }
}

init();
