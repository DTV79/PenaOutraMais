import { signOut } from '../services/auth.js';

const ITEMS = [
  ['inicio','⌂','Inicio','index.html'],
  ['socios','◎','Socios','socios.html'],
  ['cuotas','€','Cuotas','cuotas.html'],
  ['numeros','⑩','Números','numeros.html'],
  ['premios','★','Premios','premios.html'],
  ['temporadas','▦','Años','temporadas.html']
];

function renderTopNav(page) {
  return `
    <nav class="admin-top-nav" aria-label="Administración">
      ${ITEMS.map(([key,icon,label,href]) => `
        <a class="${page === key ? 'active' : ''}" href="${href}">
          <span>${icon}</span>
          <small>${label}</small>
        </a>
      `).join('')}
    </nav>
  `;
}

export function mountAdminShell(admin) {
  const page = document.body.dataset.adminPage || 'inicio';
  const header = document.querySelector('#adminHeader');
  const legacyNav = document.querySelector('#adminBottomNav');

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
            <button class="admin-logout" id="adminLogout">Salir</button>
          </div>
        </div>
        ${renderTopNav(page)}
      </header>
    `;
  }

  if (legacyNav) {
    legacyNav.innerHTML = '';
    legacyNav.hidden = true;
  }

  document.querySelector('#adminLogout')?.addEventListener('click', signOut);
}
