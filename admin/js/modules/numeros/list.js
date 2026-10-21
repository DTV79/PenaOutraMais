function escapeHtml(value = '') {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderNumbersSnapshot({ season, combinations }) {
  const summary = document.querySelector('#numbersSummary');
  const container = document.querySelector('#numbersAdmin');
  const seasonLabel = document.querySelector('[data-numbers-season]');

  if (!season) {
    container.innerHTML = '<div class="admin-error visible">No hay temporada activa.</div>';
    return;
  }

  if (seasonLabel) {
    seasonLabel.textContent = season.anio;
  }

  const active = combinations.filter((row) => row.activa).length;
  const inactive = combinations.length - active;

  summary.innerHTML = `
    <article class="admin-kpi"><small>Temporada</small><strong>${season.anio}</strong></article>
    <article class="admin-kpi"><small>Activas</small><strong>${active}</strong></article>
    <article class="admin-kpi"><small>Inactivas</small><strong>${inactive}</strong></article>
    <article class="admin-kpi"><small>Total</small><strong>${combinations.length}</strong></article>
  `;

  if (!combinations.length) {
    container.innerHTML = `
      <div class="admin-empty">
        <span>⑩</span>
        <strong>No hay combinaciones</strong>
        <p>Pulsa “Nueva combinación” para crear la primera de la temporada.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = combinations.map((row) => `
    <article class="number-admin-card ${row.activa ? '' : 'inactive'}">
      <div class="number-admin-head">
        <span class="number-order">${row.numero_orden}</span>
        <div>
          <strong>${escapeHtml(row.nombre || `Combinación ${row.numero_orden}`)}</strong>
          <small>Orden ${row.numero_orden}</small>
        </div>
        <span class="admin-status ${row.activa ? 'ok' : 'off'}">
          ${row.activa ? 'Activa' : 'Inactiva'}
        </span>
      </div>

      <div class="number-ball-row">
        ${row.numeros.map((number) => `<span class="number-ball">${number}</span>`).join('')}
      </div>

      <div class="number-admin-actions">
        <button class="admin-action secondary" type="button" data-combination-edit="${row.id}">
          Editar
        </button>
        <button class="admin-action ${row.activa ? 'danger-soft' : ''}" type="button"
          data-combination-toggle="${row.id}" data-combination-active="${row.activa ? 'true' : 'false'}">
          ${row.activa ? 'Desactivar' : 'Reactivar'}
        </button>
      </div>
    </article>
  `).join('');
}
