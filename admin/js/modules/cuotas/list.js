function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-ES', {
    useGrouping:'always',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' €';
}

function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = String(value).split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
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

function movementEffect(movement, currentYear) {
  if (movement.anulado_at) return 0;

  if (movement.tipo === 'saldo_a_favor') {
    return movement.aplicar_anio === currentYear ? Number(movement.importe) : 0;
  }

  if (movement.aplicar_anio && movement.aplicar_anio !== currentYear) return 0;
  return Number(movement.importe);
}

function typeLabel(row) {
  const labels = {
    pago:'Pago',
    ajuste:'Ajuste',
    devolucion:'Devolución',
    saldo_a_favor:'Saldo a favor'
  };
  return labels[row.tipo] || row.tipo;
}

export function renderQuotaSnapshot({ season, members, movements, quotaPlaySpend }) {
  const summary = document.querySelector('#feesSummary');
  const container = document.querySelector('#feesAdmin');
  const pendingBox = document.querySelector('#feesPending');
  const futureBox = document.querySelector('#feesFuture');
  const fundBox = document.querySelector('#feesFund');

  if (!season) {
    container.innerHTML = '<div class="admin-error visible">No hay temporada activa.</div>';
    return;
  }

  const aliasById = new Map(members.map((member) => [member.id, member.alias]));
  const validMovements = movements.filter((movement) => !movement.anulado_at);

  const totalsByMember = new Map(
    members.map((member) => [member.id, 0])
  );

  validMovements.forEach((movement) => {
    if (!totalsByMember.has(movement.socio_id)) return;
    totalsByMember.set(
      movement.socio_id,
      totalsByMember.get(movement.socio_id) + movementEffect(movement, season.anio)
    );
  });

  const expected = members.length * Number(season.cuota_anual || 0);
  const paid = [...totalsByMember.values()].reduce((sum, value) => sum + value, 0);
  const pending = members.reduce((sum, member) => {
    const contribution = totalsByMember.get(member.id) || 0;
    return sum + Math.max(Number(season.cuota_anual) - contribution, 0);
  }, 0);

  summary.innerHTML = `
    <article class="admin-kpi"><small>Socios activos</small><strong>${members.length}</strong></article>
    <article class="admin-kpi"><small>Previsto</small><strong>${formatMoney(expected)}</strong></article>
    <article class="admin-kpi"><small>Aportado</small><strong>${formatMoney(paid)}</strong></article>
    <article class="admin-kpi"><small>Pendiente</small><strong>${formatMoney(pending)}</strong></article>
  `;

  const spent = Number(quotaPlaySpend || 0);
  const available = paid - spent;

  fundBox.innerHTML = `
    <article class="admin-kpi"><small>Cuotas cobradas</small><strong>${formatMoney(paid)}</strong></article>
    <article class="admin-kpi"><small>Jugado con cuotas</small><strong>${formatMoney(spent)}</strong></article>
    <article class="admin-kpi"><small>Disponible</small><strong class="${available < 0 ? 'danger-text' : ''}">${formatMoney(available)}</strong></article>
  `;

  const pendingMembers = members
    .map((member) => ({
      ...member,
      pending: Math.max(
        Number(season.cuota_anual) - (totalsByMember.get(member.id) || 0),
        0
      )
    }))
    .filter((member) => member.pending > 0.0001);

  pendingBox.innerHTML = pendingMembers.length
    ? pendingMembers.map((member) => `
        <div class="quota-pending-row">
          <div>
            <strong>${escapeHtml(member.alias)}</strong>
            <small>Pendiente en ${season.anio}</small>
          </div>
          <strong>${formatMoney(member.pending)}</strong>
        </div>
      `).join('')
    : '<div class="admin-empty"><span>✓</span><strong>Todos al corriente</strong></div>';

  const futureMovements = validMovements.filter(
    (movement) =>
      movement.tipo === 'saldo_a_favor' &&
      Number(movement.aplicar_anio) > Number(season.anio)
  );

  const futureTotal = futureMovements.reduce(
    (sum, movement) => sum + Number(movement.importe),
    0
  );

  futureBox.innerHTML = futureMovements.length
    ? `
      <div class="quota-future-head">
        <span>Saldo total futuro</span>
        <strong>${formatMoney(futureTotal)}</strong>
      </div>
      ${futureMovements.map((movement) => `
        <div class="quota-pending-row quota-future-row">
          <div>
            <strong>${escapeHtml(aliasById.get(movement.socio_id) || '—')}</strong>
            <small>Aplicar a ${movement.aplicar_anio}</small>
          </div>
          <strong>+${formatMoney(movement.importe)}</strong>
        </div>
      `).join('')}
    `
    : '<div class="admin-empty"><span>↗</span><strong>Sin saldos futuros</strong></div>';

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
      <table class="admin-table quota-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Socio</th>
            <th>Tipo</th>
            <th>Método</th>
            <th>Destino</th>
            <th>Importe</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${movements.map((row) => `
            <tr class="${row.anulado_at ? 'quota-row-cancelled' : ''}">
              <td>${formatDate(row.fecha)}</td>
              <td><strong>${escapeHtml(aliasById.get(row.socio_id) || '—')}</strong></td>
              <td>
                ${escapeHtml(typeLabel(row))}
                ${row.anulado_at ? '<span class="quota-cancelled-tag">Anulado</span>' : ''}
              </td>
              <td>${escapeHtml(row.metodo || '—')}</td>
              <td>${row.aplicar_anio ? escapeHtml(row.aplicar_anio) : season.anio}</td>
              <td class="${Number(row.importe) < 0 ? 'danger-text' : ''}">
                <strong>${formatMoney(row.importe)}</strong>
              </td>
              <td>
                ${row.anulado_at ? '' : `
                  <div class="quota-row-actions">
                    <button type="button" class="admin-mini-action" data-quota-edit="${row.id}">Editar</button>
                    <button type="button" class="admin-mini-action danger" data-quota-cancel="${row.id}">Anular</button>
                  </div>
                `}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
