const filterState = {
  search: '',
  type: 'todos',
  month: 'todos',
  status: 'todos',
  order: 'fecha_desc'
};

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

function dateSortValue(row) {
  if (row.fecha) {
    const [y,m,d] = row.fecha.split('-').map(Number);
    return (y * 10000) + (m * 100) + d;
  }

  const year = Number(row.anio || 0);
  const month = Number(row.mes || 1);
  return (year * 10000) + (month * 100) + 1;
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

function monthLabel(month) {
  return [
    '',
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ][Number(month)] || 'Sin mes';
}

function actionButtons(row) {
  if (row.anulado_at) {
    return '<div class="quota-row-actions">' +
      '<button class="admin-mini-action danger" type="button" data-award-delete="' +
      row.id + '">Eliminar</button></div>';
  }

  return '<div class="quota-row-actions">' +
    '<button class="admin-mini-action" type="button" data-award-edit="' +
    row.id + '">Editar</button>' +
    '<button class="admin-mini-action danger" type="button" data-award-cancel="' +
    row.id + '">Anular</button></div>';
}

function visibleRows(movements) {
  const search = filterState.search.trim().toLowerCase();

  const filtered = movements.filter((row) => {
    if (filterState.type !== 'todos' && row.tipo !== filterState.type) return false;

    const rowMonth = Number(row.mes || (row.fecha ? row.fecha.split('-')[1] : 0));
    if (filterState.month !== 'todos' && rowMonth !== Number(filterState.month)) return false;

    if (filterState.status === 'activos' && row.anulado_at) return false;
    if (filterState.status === 'anulados' && !row.anulado_at) return false;

    if (search) {
      const haystack = [
        row.concepto,
        row.observaciones,
        label(row.tipo),
        formatDate(row),
        row.importe
      ].join(' ').toLowerCase();

      if (!haystack.includes(search)) return false;
    }

    return true;
  });

  return filtered.sort((a,b) => {
    switch (filterState.order) {
      case 'fecha_asc':
        return dateSortValue(a) - dateSortValue(b) || Number(a.id) - Number(b.id);
      case 'importe_desc':
        return Number(b.importe || 0) - Number(a.importe || 0) || dateSortValue(b) - dateSortValue(a);
      case 'importe_asc':
        return Number(a.importe || 0) - Number(b.importe || 0) || dateSortValue(b) - dateSortValue(a);
      case 'concepto_asc':
        return String(a.concepto || '').localeCompare(String(b.concepto || ''),'es',{sensitivity:'base'});
      case 'concepto_desc':
        return String(b.concepto || '').localeCompare(String(a.concepto || ''),'es',{sensitivity:'base'});
      case 'fecha_desc':
      default:
        return dateSortValue(b) - dateSortValue(a) || Number(b.id) - Number(a.id);
    }
  });
}

function filterOptions(movements) {
  const types=[...new Set(movements.map((row)=>row.tipo))].sort((a,b)=>label(a).localeCompare(label(b),'es'));
  const months=[...new Set(
    movements.map((row)=>Number(row.mes || (row.fecha ? row.fecha.split('-')[1] : 0))).filter(Boolean)
  )].sort((a,b)=>a-b);

  return { types, months };
}

function renderTable(box,movements) {
  const rows=visibleRows(movements);
  const { types, months }=filterOptions(movements);

  box.innerHTML = `
    <div class="award-filter-bar">
      <div class="award-filter-search">
        <label for="awardFilterSearch">Buscar</label>
        <input id="awardFilterSearch" type="search" placeholder="Concepto, fecha, importe…"
          value="${esc(filterState.search)}" />
      </div>

      <div>
        <label for="awardFilterType">Tipo</label>
        <select id="awardFilterType">
          <option value="todos">Todos</option>
          ${types.map((type)=>`
            <option value="${esc(type)}" ${filterState.type===type?'selected':''}>${esc(label(type))}</option>
          `).join('')}
        </select>
      </div>

      <div>
        <label for="awardFilterMonth">Mes</label>
        <select id="awardFilterMonth">
          <option value="todos">Todos</option>
          ${months.map((month)=>`
            <option value="${month}" ${String(filterState.month)===String(month)?'selected':''}>
              ${monthLabel(month)}
            </option>
          `).join('')}
        </select>
      </div>

      <div>
        <label for="awardFilterStatus">Estado</label>
        <select id="awardFilterStatus">
          <option value="todos" ${filterState.status==='todos'?'selected':''}>Todos</option>
          <option value="activos" ${filterState.status==='activos'?'selected':''}>Activos</option>
          <option value="anulados" ${filterState.status==='anulados'?'selected':''}>Anulados</option>
        </select>
      </div>

      <div class="award-filter-order">
        <label for="awardFilterOrder">Ordenar</label>
        <select id="awardFilterOrder">
          <option value="fecha_desc" ${filterState.order==='fecha_desc'?'selected':''}>Fecha: reciente → antiguo</option>
          <option value="fecha_asc" ${filterState.order==='fecha_asc'?'selected':''}>Fecha: antiguo → reciente</option>
          <option value="importe_desc" ${filterState.order==='importe_desc'?'selected':''}>Importe: mayor → menor</option>
          <option value="importe_asc" ${filterState.order==='importe_asc'?'selected':''}>Importe: menor → mayor</option>
          <option value="concepto_asc" ${filterState.order==='concepto_asc'?'selected':''}>Concepto: A → Z</option>
          <option value="concepto_desc" ${filterState.order==='concepto_desc'?'selected':''}>Concepto: Z → A</option>
        </select>
      </div>

      <button class="admin-mini-action award-filter-reset" type="button" id="awardFilterReset">Restablecer</button>
    </div>

    <div class="award-filter-result">
      <span>${rows.length} de ${movements.length} movimientos</span>
    </div>

    ${rows.length ? `
      <div class="admin-table-wrap">
        <table class="admin-table award-table">
          <thead>
            <tr><th>Fecha</th><th>Tipo</th><th>Concepto</th><th>Importe</th><th></th></tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
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
                <td>${actionButtons(row)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : `
      <div class="admin-empty award-filter-empty">
        <span>⌕</span>
        <strong>No hay movimientos con estos filtros</strong>
        <p>Prueba a cambiar algún filtro o restablecerlos.</p>
      </div>
    `}
  `;

  const rerender=()=>renderTable(box,movements);

  box.querySelector('#awardFilterSearch')?.addEventListener('input',(event)=>{
    filterState.search=event.target.value;
    rerender();
    const input=box.querySelector('#awardFilterSearch');
    input?.focus();
    input?.setSelectionRange(input.value.length,input.value.length);
  });

  box.querySelector('#awardFilterType')?.addEventListener('change',(event)=>{
    filterState.type=event.target.value;
    rerender();
  });

  box.querySelector('#awardFilterMonth')?.addEventListener('change',(event)=>{
    filterState.month=event.target.value;
    rerender();
  });

  box.querySelector('#awardFilterStatus')?.addEventListener('change',(event)=>{
    filterState.status=event.target.value;
    rerender();
  });

  box.querySelector('#awardFilterOrder')?.addEventListener('change',(event)=>{
    filterState.order=event.target.value;
    rerender();
  });

  box.querySelector('#awardFilterReset')?.addEventListener('click',()=>{
    filterState.search='';
    filterState.type='todos';
    filterState.month='todos';
    filterState.status='todos';
    filterState.order='fecha_desc';
    rerender();
  });
}

export function renderBoteMovements(movements) {
  const box = document.querySelector('#awardsMovements');

  if (!movements.length) {
    box.innerHTML = '<div class="admin-empty"><span>★</span><strong>Sin movimientos</strong></div>';
    return;
  }

  renderTable(box,movements);
}
