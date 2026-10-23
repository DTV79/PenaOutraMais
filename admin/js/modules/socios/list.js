function escapeHtml(value = '') {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = String(value).split('-');
  return day && month && year ? `${day}/${month}/${year}` : escapeHtml(value);
}

export function renderMembers(container, rows) {
  if (!rows.length) {
    container.innerHTML = `
      <div class="admin-empty">
        <span>◎</span>
        <strong>Todavía no hay socios cargados</strong>
        <p>Pulsa “Nuevo socio” para añadir el primero o importa después los socios históricos desde el Excel.</p>
      </div>
    `;
    return;
  }

  const active = rows.filter((row) => !row.fecha_baja).length;
  const inactive = rows.length - active;

  container.innerHTML = `
    <div class="member-summary">
      <span><strong>${active}</strong> activos</span>
      <span><strong>${inactive}</strong> bajas</span>
      <span><strong>${rows.length}</strong> total</span>
    </div>

    <div class="member-admin-list">
      ${rows.map((row) => `
        <article class="member-admin-card" data-member-search="${escapeHtml([row.alias, row.nombre, row.apellidos].filter(Boolean).join(' '))}">
          <div class="member-admin-top">
            <span class="member-admin-avatar">${escapeHtml(row.alias?.slice(0, 2).toUpperCase() || '—')}</span>
            <div class="member-admin-name">
              <strong>${escapeHtml(row.alias)}</strong>
              <small>${row.nombre || row.apellidos ? `${escapeHtml(row.nombre)} ${escapeHtml(row.apellidos)}`.trim() : 'Datos personales pendientes'}</small>
            </div>
            <span class="admin-status ${row.fecha_baja ? 'off' : 'ok'}">
              ${row.fecha_baja ? 'Baja' : 'Activo'}
            </span>
          </div>

          <div class="member-admin-meta">
            <div><small>Alta</small><strong>${formatDate(row.fecha_alta)}</strong></div>
            <div><small>DNI</small><strong>${escapeHtml(row.dni) || '—'}</strong></div>
            <div><small>Teléfono</small><strong>${escapeHtml(row.telefono || '—')}</strong></div>
            <div><small>Email</small><strong class="truncate">${escapeHtml(row.email || '—')}</strong></div>
          </div>

          ${row.fecha_baja ? `
            <p class="member-off-note">Baja desde ${formatDate(row.fecha_baja)}</p>
          ` : ''}

          <div class="member-admin-actions">
            <button class="admin-action secondary" type="button" data-member-edit="${row.id}">Editar</button>
            <button class="admin-action ${row.fecha_baja ? '' : 'danger-soft'}" type="button"
              data-member-toggle="${row.id}" data-member-inactive="${row.fecha_baja ? 'true' : 'false'}">
              ${row.fecha_baja ? 'Reactivar' : 'Dar de baja'}
            </button>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}
