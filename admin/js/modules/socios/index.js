import { bootstrapAdmin } from '../../app/bootstrap.js?v=20261022-23';
import { confirmModal, openModal, closeModal } from '../../ui/modal.js';
import {
  getMembers,
  createMember,
  updateMember,
  deactivateMember,
  reactivateMember
} from './service.js?v=20261021-24';
import { renderMembers } from './list.js?v=20261021-24';
import { openMemberForm } from './form.js?v=20261021-24';

let members = [];
const container = document.querySelector('#membersAdmin');

function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

async function refreshMembers() {
  container.className = 'admin-loading';
  container.textContent = 'Cargando socios…';

  try {
    members = await getMembers();
    container.className = '';
    renderMembers(container, members);
  } catch (error) {
    container.className = '';
    container.innerHTML = `<div class="admin-error visible">${error.message}</div>`;
  }
}

async function openCreate() {
  openMemberForm({
    onSave: async (payload) => {
      await createMember(payload);
      await refreshMembers();
    }
  });
}

async function openEdit(id) {
  const member = members.find((row) => row.id === id);
  if (!member) return;

  openMemberForm({
    member,
    onSave: async (payload) => {
      await updateMember(id, payload);
      await refreshMembers();
    }
  });
}

async function chooseDeactivateDate(member) {
  const modal = openModal({
    title: 'Dar de baja',
    subtitle: member.alias,
    content: `
      <p class="admin-confirm-text">El socio seguirá conservándose en el histórico. Solo dejará de aparecer como activo.</p>
      <div class="admin-form-field">
        <label for="memberDeactivateDate">Fecha de baja</label>
        <input id="memberDeactivateDate" type="date" value="${todayIso()}" />
      </div>
      <div id="memberDeactivateError" class="admin-error"></div>
    `,
    actions: `
      <button class="admin-action secondary" type="button" data-modal-close>Cancelar</button>
      <button class="admin-action danger" type="button" id="memberDeactivateConfirm">Dar de baja</button>
    `
  });

  modal.querySelector('#memberDeactivateConfirm').addEventListener('click', async () => {
    const date = modal.querySelector('#memberDeactivateDate').value;
    const errorBox = modal.querySelector('#memberDeactivateError');

    if (!date) {
      errorBox.textContent = 'Selecciona una fecha de baja.';
      errorBox.classList.add('visible');
      return;
    }

    try {
      await deactivateMember(member.id, date);
      closeModal();
      await refreshMembers();
    } catch (error) {
      errorBox.textContent = error?.message || 'No se pudo dar de baja.';
      errorBox.classList.add('visible');
    }
  });
}

async function toggleMember(id, inactive) {
  const member = members.find((row) => row.id === id);
  if (!member) return;

  if (!inactive) {
    await chooseDeactivateDate(member);
    return;
  }

  const confirmed = await confirmModal({
    title: 'Reactivar socio',
    message: `¿Quieres volver a activar a ${member.alias}?`,
    confirmText: 'Reactivar'
  });

  if (!confirmed) return;

  try {
    await reactivateMember(id);
    await refreshMembers();
  } catch (error) {
    openModal({
      title: 'No se pudo reactivar',
      content: `<div class="admin-error visible">${error.message}</div>`,
      actions: '<button class="admin-action" type="button" data-modal-close>Cerrar</button>'
    });
  }
}

async function init() {
  if (!await bootstrapAdmin()) return;

  document.querySelector('#newMemberButton')?.addEventListener('click', openCreate);

  container.addEventListener('click', (event) => {
    const edit = event.target.closest('[data-member-edit]');
    if (edit) {
      openEdit(edit.dataset.memberEdit);
      return;
    }

    const toggle = event.target.closest('[data-member-toggle]');
    if (toggle) {
      toggleMember(
        toggle.dataset.memberToggle,
        toggle.dataset.memberInactive === 'true'
      );
    }
  });

  await refreshMembers();
}

init();
