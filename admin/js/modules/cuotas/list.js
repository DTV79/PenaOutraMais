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

function movementEffect(movement, season) {
  if (movement.anulado_at) return 0;

  const currentYear=Number(season.anio);

  if (movement.tipo === 'saldo_a_favor') {
    return Number(movement.aplicar_anio) === currentYear
      ? Number(movement.importe)
      : 0;
  }

  if (Number(movement.temporada_id) !== Number(season.id)) return 0;
  if (movement.aplicar_anio && Number(movement.aplicar_anio) !== currentYear) return 0;
  return Number(movement.importe);
}

function typeLabel(row) {
  const labels = {
    pago:'Pago',
    ajuste:'Ajuste',
    devolucion:'Devolución',
    saldo_a_favor:'Pago adelantado'
  };
  return labels[row.tipo] || row.tipo;
}

function setTabCount(name,value) {
  const badge=document.querySelector(`[data-quota-tab-count="${name}"]`);
  if (badge) badge.textContent=String(value);
}

export function renderQuotaSnapshot({ season, members, movements, allMovements=[], quotaSpent, elapsedWeeks }) {
  const summary = document.querySelector('#feesSummary');
  const container = document.querySelector('#feesAdmin');
  const pendingBox = document.querySelector('#feesPending');
  const futureBox = document.querySelector('#feesFuture');
  const fundBox = document.querySelector('#feesFund');
  const fundExplanation = document.querySelector('#feesFundExplanation');

  if (!season) {
    container.innerHTML = '<div class="admin-error visible">No hay temporada activa.</div>';
    return;
  }

  const aliasById = new Map(members.map((member) => [member.id, member.alias]));
  const validMovements = allMovements.filter((movement) => !movement.anulado_at);

  const totalsByMember = new Map(
    members.map((member) => [member.id, 0])
  );

  validMovements.forEach((movement) => {
    if (!totalsByMember.has(movement.socio_id)) return;
    totalsByMember.set(
      movement.socio_id,
      totalsByMember.get(movement.socio_id) + movementEffect(movement, season)
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
    <article class="admin-kpi"><small>Previsto ${season.anio}</small><strong>${formatMoney(expected)}</strong></article>
    <article class="admin-kpi"><small>Cobrado ${season.anio}</small><strong>${formatMoney(paid)}</strong></article>
    <article class="admin-kpi"><small>Pendiente</small><strong>${formatMoney(pending)}</strong></article>
  `;

  const spent = Number(quotaSpent || 0);
  const available = paid - spent;

  fundBox.innerHTML = `
    <article class="admin-kpi"><small>Cuotas cobradas</small><strong>${formatMoney(paid)}</strong></article>
    <article class="admin-kpi"><small>Gastado cuotas</small><strong>${formatMoney(spent)}</strong></article>
    <article class="admin-kpi"><small>Disponible para jugar</small><strong class="${available < 0 ? 'danger-text' : ''}">${formatMoney(available)}</strong></article>
  `;

  if (fundExplanation) {
    const totalWeeks=Number(season.numero_semanas || 52);
    fundExplanation.innerHTML =
      `<strong>${elapsedWeeks} de ${totalWeeks} semanas jugadas</strong>`;
  }

  const pendingMembers = members
    .map((member) => ({
      ...member,
      pending: Math.max(
        Number(season.cuota_anual) - (totalsByMember.get(member.id) || 0),
        0
      )
    }))
    .filter((member) => member.pending > 0.0001);

  setTabCount('pendientes',pendingMembers.length);

  pendingBox.innerHTML = pendingMembers.length
    ? `
      <div class="quota-status-callout warning">
        <div>
          <small>Pendiente total</small>
          <strong>${formatMoney(pending)}</strong>
        </div>
        <p>${pendingMembers.length} socio${pendingMembers.length===1?'':'s'} con parte de la cuota ${season.anio} pendiente.</p>
      </div>
      ${pendingMembers.map((member) => `
        <div class="quota-pending-row">
          <div>
            <strong>${escapeHtml(member.alias)}</strong>
            <small>Pendiente de la cuota ${season.anio}</small>
          </div>
          <strong>${formatMoney(member.pending)}</strong>
        </div>
      `).join('')}
    `
    : `
      <div class="quota-status-callout success">
        <div>
          <small>Temporada ${season.anio}</small>
          <strong>0,00 €</strong>
        </div>
        <p>Todos los socios están al corriente. No queda ninguna cuota pendiente.</p>
      </div>
    `;

  const futureMovements = validMovements.filter(
    (movement) =>
      movement.tipo === 'saldo_a_favor' &&
      Number(movement.aplicar_anio) > Number(season.anio)
  );

  const futureTotal = futureMovements.reduce(
    (sum, movement) => sum + Number(movement.importe),
    0
  );

  setTabCount('movimientos',movements.length);
  setTabCount('adelantos',futureMovements.length);

  const futureByYear = new Map();
  futureMovements.forEach((movement) => {
    const year=Number(movement.aplicar_anio);
    if (!futureByYear.has(year)) futureByYear.set(year,[]);
    futureByYear.get(year).push(movement);
  });

  futureBox.innerHTML = futureMovements.length
    ? `
      <div class="quota-advance-summary">
        <div>
          <small>Total ya pagado para próximos años</small>
          <strong>${formatMoney(futureTotal)}</strong>
        </div>
        <p>Este dinero no cuenta como cobrado en ${season.anio}: queda reservado para descontarlo de futuras cuotas.</p>
      </div>

      <div class="quota-advance-years">
        ${[...futureByYear.entries()]
          .sort((a,b)=>a[0]-b[0])
          .map(([year,rows])=>{
            const yearTotal=rows.reduce((sum,row)=>sum+Number(row.importe || 0),0);
            return `
              <section class="quota-advance-year">
                <header class="quota-advance-year-head">
                  <div><small>Temporada</small><strong>${year}</strong></div>
                  <span>${formatMoney(yearTotal)} adelantados</span>
                </header>
                ${rows.map((movement)=>`
                  <div class="quota-pending-row quota-future-row">
                    <div>
                      <strong>${escapeHtml(aliasById.get(movement.socio_id) || '—')}</strong>
                      <small>Ya pagado para ${year}</small>
                    </div>
                    <strong>+${formatMoney(movement.importe)}</strong>
                  </div>
                `).join('')}
              </section>
            `;
          }).join('')}
      </div>
    `
    : `
      <div class="quota-status-callout neutral">
        <div><small>Próximas temporadas</small><strong>0,00 €</strong></div>
        <p>No hay ningún pago adelantado. Todo lo cobrado corresponde a la temporada ${season.anio}.</p>
      </div>
    `;

  if (!movements.length) {
    container.innerHTML = `
      <div class="admin-empty">
        <span>€</span><strong>Sin movimientos de cuotas</strong>
      </div>
    `;
    return;
  }

  const mobileCards = movements.map((row) => {
    const member = escapeHtml(aliasById.get(row.socio_id) || '—');
    const year = row.aplicar_anio ? escapeHtml(row.aplicar_anio) : season.anio;
    const amountClass = Number(row.importe) < 0 ? 'danger-text' : 'positive-text';

    return `
      <article class="quota-movement-card ${row.anulado_at ? 'cancelled' : ''}">
        <div class="quota-movement-head">
          <div>
            <strong class="quota-movement-member">${member}</strong>
            <span class="quota-movement-type">${escapeHtml(typeLabel(row))}</span>
            ${row.anulado_at ? '<span class="quota-cancelled-tag">Anulado</span>' : ''}
          </div>
          <strong class="quota-movement-amount ${amountClass}">${formatMoney(row.importe)}</strong>
        </div>

        <div class="quota-movement-meta">
          <div><small>Fecha</small><strong>${formatDate(row.fecha)}</strong></div>
          <div><small>Método</small><strong>${escapeHtml(row.metodo || '—')}</strong></div>
          <div><small>Temporada</small><strong>${year}</strong></div>
        </div>

        ${row.anulado_at ? '' : `
          <div class="quota-movement-actions">
            <button type="button" class="admin-mini-action" data-quota-edit="${row.id}">Editar</button>
            <button type="button" class="admin-mini-action danger" data-quota-cancel="${row.id}">Anular</button>
          </div>
        `}
      </article>
    `;
  }).join('');

  container.innerHTML = `
    <div class="quota-mobile-list">${mobileCards}</div>

    <div class="admin-table-wrap quota-desktop-table">
      <table class="admin-table quota-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Socio</th>
            <th>Tipo</th>
            <th>Método</th>
            <th>Temporada</th>
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
