import { signOut } from '../services/auth.js';

export function mountAdminShell(admin) {
  document.querySelectorAll('.admin-top-nav-static').forEach((nav)=>nav.remove());

  const header = document.querySelector('#adminHeader');

  if (header) {
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
            <div class="admin-user">
              <strong>${admin?.nombre || 'Administrador'}</strong>
              <small>Sesión segura</small>
            </div>
            <a class="admin-logout admin-home-button" href="index.html?v=20261022-24" aria-label="Ir al inicio">
              <span>⌂</span>
              <strong>Inicio</strong>
            </a>
            <button class="admin-logout" id="adminLogout">Salir</button>
          </div>
        </div>
      </header>
    `;
  }

  document.querySelector('#adminLogout')?.addEventListener('click', signOut);
}
