import { fallbackMembers } from '../data/fallback.js';

export function renderMembers(filter = 'all') {
  const container = document.querySelector('#members');
  if (!container) return;

  container.innerHTML = fallbackMembers.map((member) => {
    const hidden = filter !== 'all' && member.status !== filter;
    return `
      <div class="member ${hidden ? 'hidden' : ''}">
        <span class="avatar">${member.name.slice(0, 2)}</span>
        <div class="member-main">
          <strong>${member.name}</strong>
          <small>${member.note}</small>
        </div>
        <span class="status-badge ${member.status}">
          ${member.status === 'ok' ? 'Al corriente' : 'Pendiente'}
        </span>
      </div>
    `;
  }).join('');
}

export function initQuotaFilters() {
  document.addEventListener('click', (event) => {
    const filterButton = event.target.closest('[data-filter]');
    if (!filterButton) return;

    document.querySelectorAll('.filter').forEach((button) => {
      button.classList.toggle('active', button === filterButton);
    });

    renderMembers(filterButton.dataset.filter);
  });
}
