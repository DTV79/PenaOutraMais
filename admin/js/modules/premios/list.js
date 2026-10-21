function money(value) {
  return Number(value || 0).toLocaleString('es-ES',{
    minimumFractionDigits:2,
    maximumFractionDigits:2
  }) + ' €';
}

function formatDate(row) {
  if (row.fecha) {
    const [y,m,d] = row.fecha.split('-');
    return `${d}/${m}/${y}`;
  }
  if (row.mes) return `${String(row.mes).padStart(2,'0')}/${row.anio}`;
  return String(row.anio);
}

function esc(value='') {
  if (value === null || value === undefined) return '';
  return String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function label(type) {
  return {
    arrastre:'Arrastre',
    premio:'Premio',
    gasto:'Gasto',
    premio_extra:'Premio extra',
    reparto:'Reparto',
    ajuste:'Ajuste'
  }[type] || type;
}

export function renderBoteMovements(movements) {
  const box = document.querySelector('#awardsMovements');

  if (!movements.length) {
    box.innerHTML = '<div class="admin-empty"><span>★</span><strong>Sin movimientos</strong></div>';
    return;
  }

  box.innerHTML = `
    <div class="admin-table-wrap">
      <table class="admin-table award-table">
        <thead>
          <tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Importe</th><th></th></tr>
        </thead>
        <tbody>
          ${movements.map((row) => `
            <tr class="${row.anulado_at ? 'award-row-cancelled' : ''}">
              <td>${formatDate(row)}</td>
              <td>
                ${esc(label(row.tipo))}
                ${row.anulado_at ? '<span class="quota-cancelled-tag">Anulado</span>' : ''}
              </td>
              <td>
                <strong>${esc(row.concepto)}</strong>
                ${row.observaciones ? `<small class="award-note">${esc(row.observaciones)}</small>` : ''}
              </td>
              <td class="${Number(row.importe) < 0 ? 'danger-text' : 'positive-text'}"><strong>${money(row.importe)}</strong></td>
              <td>
                ${row.anulado_at ? '' : `
                  <div class="quota-row-actions">
                    <button class="admin-mini-action" type="button" data-award-edit="${row.id}">Editar</button>
                    <button class="admin-mini-action danger" type="button" data-award-cancel="${row.id}">Anular</button>
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
