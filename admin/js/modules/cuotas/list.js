function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' €';
}

function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function escapeHtml(value = '') {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderQuotaSnapshot({ season, members, movements }) {
  const summary = document.querySelector('#feesSummary');
  const container = document.querySelector('#feesAdmin');
  const pendingBox = document.querySelector('#feesPending');

  if (!season) {
    container.innerHTML = '<div class="admin-error visible">No hay temporada activa.</div>';
    return;
  }

  const aliasById = new Map(members.map((member) => [member.id, member.alias]));
  const payments = movements.filter((movement) => movement.tipo === 'pago');
  const paid = payments.reduce((sum, movement) => sum + Number(movement.importe), 0);
  const expected = members.length * Number(season.cuota_anual || 0);
  const pending = Math.max(expected - paid, 0);

  summary.innerHTML = `
    <article class="admin-kpi"><small>Socios activos</small><strong>${members.length}</strong></article>
    <article class="admin-kpi"><small>Previsto</small><strong>${formatMoney(expected)}</strong></article>
    <article class="admin-kpi"><small>Pagado</small><strong>${formatMoney(paid)}</strong></article>
    <article class="admin-kpi"><small>Pendiente</small><strong>${formatMoney(pending)}</strong></article>
  `;

  const paidMemberIds = new Set(payments.map((payment) => payment.socio_id));
  const pendingMembers = members.filter((member) => !paidMemberIds.has(member.id));

  pendingBox.innerHTML = pendingMembers.length
    ? pendingMembers.map((member) => `
        <div class="quota-pending-row">
          <div><strong>${escapeHtml(member.alias)}</strong><small>Sin pago registrado en ${season.anio}</small></div>
          <strong>${formatMoney(season.cuota_anual)}</strong>
        </div>
      `).join('')
    : '<div class="admin-empty"><span>✓</span><strong>Todos al corriente</strong></div>';

  if (!movements.length) {
    container.innerHTML = `
      <div class="admin-empty">
        <span>€</span><strong>Sin movimientos de cuotas</strong>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr><th>Fecha</th><th>Socio</th><th>Tipo</th><th>Método</th><th>Importe</th></tr>
        </thead>
        <tbody>
          ${movements.map((row) => `
            <tr>
              <td>${formatDate(row.fecha)}</td>
              <td><strong>${escapeHtml(aliasById.get(row.socio_id) || '—')}</strong></td>
              <td>${escapeHtml(row.tipo)}</td>
              <td>${escapeHtml(row.metodo || '—')}</td>
              <td><strong>${formatMoney(row.importe)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
