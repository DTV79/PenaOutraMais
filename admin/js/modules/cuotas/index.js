import { bootstrapAdmin } from '../../app/bootstrap.js?v=20261023-13';
import { confirmModal, openModal } from '../../ui/modal.js';
import {
  getQuotaSnapshot,
  createQuotaMovement,
  updateQuotaMovement,
  cancelQuotaMovement
} from './service.js?v=20261028-1';
import { renderQuotaSnapshot } from './list.js?v=20261022-35';
import { openQuotaForm } from './form.js?v=20261021-15';
import {
  buildQuotaShareData,
  buildIndividualWhatsApp,
  buildGeneralWhatsApp,
  shareWhatsApp,
  shareIndividualCard,
  shareGeneralCard
} from './share.js?v=20261028-1';

let snapshot = null;
const container = document.querySelector('#feesAdmin');

function activateQuotaTab(name) {
  document.querySelectorAll('[data-quota-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.quotaTab === name);
  });

  document.querySelectorAll('[data-quota-panel]').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.quotaPanel === name);
  });
}

function setupQuotaTabs() {
  document.querySelectorAll('[data-quota-tab]').forEach((button) => {
    button.addEventListener('click', () => activateQuotaTab(button.dataset.quotaTab));
  });
}

async function refresh() {
  try {
    snapshot = await getQuotaSnapshot();
    renderQuotaSnapshot(snapshot);
    renderSharePanel();
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
      activateQuotaTab('movimientos');
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
      activateQuotaTab('movimientos');
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
    activateQuotaTab('movimientos');
  } catch (error) {
    openModal({
      title: 'No se pudo anular',
      content: `<div class="admin-error visible">${error.message}</div>`,
      actions: '<button class="admin-action" type="button" data-modal-close>Cerrar</button>'
    });
  }
}


function renderSharePanel() {
  const box=document.querySelector('#feesShare');
  if (!box || !snapshot?.season) return;

  const data=buildQuotaShareData(snapshot);
  box.innerHTML=`
    <div class="quota-share-grid">
      <article class="quota-share-card">
        <div>
          <p class="eyebrow">TODOS LOS SOCIOS</p>
          <h3>Resumen general ${data.season.anio}</h3>
          <p>${data.currentCount} de ${data.rows.length} socios al corriente · Cuota anual ${data.quota.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €</p>
        </div>
        <div class="quota-share-actions">
          <button class="admin-action whatsapp" type="button" data-quota-share-general-whatsapp>WhatsApp</button>
          <button class="admin-action secondary" type="button" data-quota-share-general-card>Compartir tarjeta</button>
        </div>
      </article>

      <article class="quota-share-card">
        <div>
          <p class="eyebrow">UN SOCIO</p>
          <h3>Estado individual</h3>
          <label class="quota-share-label" for="quotaShareMember">Selecciona socio</label>
          <select id="quotaShareMember" class="quota-share-select">
            ${data.rows.map((row)=>`<option value="${row.id}">${row.alias}</option>`).join('')}
          </select>
        </div>
        <div class="quota-share-actions">
          <button class="admin-action whatsapp" type="button" data-quota-share-member-whatsapp>WhatsApp</button>
          <button class="admin-action secondary" type="button" data-quota-share-member-card>Compartir tarjeta</button>
        </div>
      </article>
    </div>
  `;
}

async function handleShareAction(event) {
  if (!snapshot?.season) return;
  const data=buildQuotaShareData(snapshot);
  const select=document.querySelector('#quotaShareMember');
  const selected=data.rows.find((row)=>String(row.id)===String(select?.value)) || data.rows[0];

  try {
    if (event.target.closest('[data-quota-share-general-whatsapp]')) {
      shareWhatsApp(buildGeneralWhatsApp(data));
      return;
    }
    if (event.target.closest('[data-quota-share-general-card]')) {
      await shareGeneralCard(data);
      return;
    }
    if (event.target.closest('[data-quota-share-member-whatsapp]')) {
      if (selected) shareWhatsApp(buildIndividualWhatsApp(data,selected));
      return;
    }
    if (event.target.closest('[data-quota-share-member-card]')) {
      if (selected) await shareIndividualCard(data,selected);
    }
  } catch (error) {
    if (error?.name==='AbortError') return;
    openModal({
      title:'No se pudo compartir',
      content:`<div class="admin-error visible">${error?.message || error}</div>`,
      actions:'<button class="admin-action" type="button" data-modal-close>Cerrar</button>'
    });
  }
}

async function init() {
  if (!await bootstrapAdmin()) return;

  setupQuotaTabs();

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

  document.querySelector('#feesShare')?.addEventListener('click', handleShareAction);

  await refresh();
}

init();
