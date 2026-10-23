import { signOut, updatePassword } from '../services/auth.js?v=20261023-13';
import { openModal, closeModal } from './modal.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function closeUserMenu() {
  const menu = document.querySelector('#adminUserMenu');
  const trigger = document.querySelector('#adminUserTrigger');
  if (!menu || !trigger) return;
  menu.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
}

function toggleUserMenu() {
  const menu = document.querySelector('#adminUserMenu');
  const trigger = document.querySelector('#adminUserTrigger');
  if (!menu || !trigger) return;

  const willOpen = menu.hidden;
  menu.hidden = !willOpen;
  trigger.setAttribute('aria-expanded', String(willOpen));
}

function openPasswordModal() {
  closeUserMenu();

  const modal = openModal({
    title: 'Cambiar contraseña',
    subtitle: 'CUENTA DE ADMINISTRACIÓN',
    content: `
      <form class="admin-form" id="changePasswordForm">
        <div class="admin-form-grid">
          <div class="admin-form-field admin-form-wide">
            <label for="newAdminPassword">Nueva contraseña</label>
            <input id="newAdminPassword" type="password" autocomplete="new-password" minlength="8" required />
          </div>
          <div class="admin-form-field admin-form-wide">
            <label for="repeatAdminPassword">Repetir contraseña</label>
            <input id="repeatAdminPassword" type="password" autocomplete="new-password" minlength="8" required />
          </div>
        </div>
        <p class="admin-form-help">Utiliza al menos 8 caracteres. La nueva contraseña se aplicará a tu acceso de administrador.</p>
        <div class="admin-error" id="changePasswordError"></div>
      </form>
    `,
    actions: `
      <button class="admin-action secondary" type="button" data-modal-close>Cancelar</button>
      <button class="admin-action" type="submit" form="changePasswordForm" id="saveAdminPassword">Guardar contraseña</button>
    `
  });

  const form = modal.querySelector('#changePasswordForm');
  const errorBox = modal.querySelector('#changePasswordError');
  const saveButton = modal.querySelector('#saveAdminPassword');
  const firstInput = modal.querySelector('#newAdminPassword');

  setTimeout(() => firstInput?.focus(), 50);

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const password = modal.querySelector('#newAdminPassword')?.value || '';
    const repeated = modal.querySelector('#repeatAdminPassword')?.value || '';

    errorBox?.classList.remove('visible');
    if (errorBox) errorBox.textContent = '';

    if (password.length < 8) {
      if (errorBox) {
        errorBox.textContent = 'La contraseña debe tener al menos 8 caracteres.';
        errorBox.classList.add('visible');
      }
      return;
    }

    if (password !== repeated) {
      if (errorBox) {
        errorBox.textContent = 'Las dos contraseñas no coinciden.';
        errorBox.classList.add('visible');
      }
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Guardando…';

    try {
      await updatePassword(password);
      closeModal();
      window.setTimeout(() => {
        window.alert('Contraseña actualizada correctamente.');
      }, 50);
    } catch (error) {
      if (errorBox) {
        errorBox.textContent = error?.message || 'No se pudo cambiar la contraseña.';
        errorBox.classList.add('visible');
      }
      saveButton.disabled = false;
      saveButton.textContent = 'Guardar contraseña';
    }
  });
}

export function mountAdminShell(admin) {
  document.querySelectorAll('.admin-top-nav-static').forEach((nav)=>nav.remove());

  const header = document.querySelector('#adminHeader');

  if (header) {
    const adminName = escapeHtml(admin?.nombre || 'Administrador');

    header.innerHTML = `
      <header class="admin-header">
        <div class="admin-header-inner">
          <a class="admin-brand" href="index.html">
            <span class="admin-brand-mark">OM</span>
            <span class="admin-brand-copy">
              <small>Zona de administración</small>
              <strong>Peña Outra Máis</strong>
            </span>
          </a>

          <div class="admin-header-actions">
            <div class="admin-user-menu-wrap">
              <button
                class="admin-user-trigger"
                id="adminUserTrigger"
                type="button"
                aria-haspopup="menu"
                aria-expanded="false"
                aria-controls="adminUserMenu"
              >
                <span class="admin-user-trigger-copy">
                  <strong>${adminName}</strong>
                  <small>Sesión segura</small>
                </span>
                <span class="admin-user-caret" aria-hidden="true">▾</span>
              </button>

              <div class="admin-user-dropdown" id="adminUserMenu" role="menu" hidden>
                <button type="button" role="menuitem" id="adminChangePassword">
                  <span aria-hidden="true">🔑</span>
                  <strong>Cambiar contraseña</strong>
                </button>
                <button type="button" role="menuitem" id="adminLogout">
                  <span aria-hidden="true">↪</span>
                  <strong>Cerrar sesión</strong>
                </button>
              </div>
            </div>

            <a class="admin-logout admin-home-button" href="index.html?v=20261022-24" aria-label="Ir al inicio">
              <span>⌂</span>
              <strong>Inicio</strong>
            </a>
          </div>
        </div>
      </header>
    `;
  }

  document.querySelector('#adminUserTrigger')?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleUserMenu();
  });

  document.querySelector('#adminUserMenu')?.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  document.querySelector('#adminChangePassword')?.addEventListener('click', openPasswordModal);
  document.querySelector('#adminLogout')?.addEventListener('click', signOut);

  document.addEventListener('click', closeUserMenu);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeUserMenu();
  });
}
