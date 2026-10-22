function money(value) {
  if (value === null || value === undefined || value === '') return '—';
  return Number(value).toLocaleString('es-ES',{
    useGrouping:'always',
    minimumFractionDigits:2,
    maximumFractionDigits:2
  }) + ' €';
}

function dateEs(value) {
  if (!value) return '—';
  const [y,m,d]=String(value).split('-');
  return `${d}/${m}/${y}`;
}

function stateOf(row,activeYear) {
  if (row.activa) return {label:'Activa',className:'ok'};
  if (Number(row.anio)>Number(activeYear)) return {label:'Preparada',className:'pending'};
  return {label:'Cerrada',className:'off'};
}

function historyLabel(row,activeYear) {
  return Number(row.anio)<Number(activeYear) ? 'Histórico' : '';
}

export function renderSeasons(snapshot,{ onActivate }={}) {
  const container=document.querySelector('#seasonsAdmin');
  const rows=snapshot.seasons || [];
  const active=rows.find((row)=>row.activa);
  const activeYear=active?.anio || new Date().getFullYear();

  if (!rows.length) {
    container.innerHTML='<div class="admin-empty"><span>▦</span><strong>Sin temporadas</strong></div>';
    return;
  }

  container.innerHTML=`
    <div class="season-summary-strip">
      <div><small>Primera temporada</small><strong>${rows[rows.length-1]?.anio || '—'}</strong></div>
      <div><small>Temporada activa</small><strong>${activeYear}</strong></div>
      <div><small>Años registrados</small><strong>${rows.length}</strong></div>
    </div>

    <div class="admin-table-wrap">
      <table class="admin-table season-table">
        <thead>
          <tr>
            <th>Año</th>
            <th>Estado</th>
            <th>Cuota anual</th>
            <th>Arrastre</th>
            <th>Premios</th>
            <th>Total</th>
            <th>Salidas / cenas</th>
            <th>Saldo final</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row)=>{
            const summary=row.summary;
            const state=stateOf(row,activeYear);
            const prizes=summary
              ? Number(summary.premios_ordinarios || 0)+Number(summary.premios_extra || 0)
              : null;
            const total=summary
              ? Number(summary.arrastre_inicial || 0)+Number(prizes || 0)
              : null;
            const prepared=!row.activa && Number(row.anio)>Number(activeYear);
            const canActivate=prepared && new Date().toISOString().slice(0,10)>=row.fecha_inicio;
            const history=historyLabel(row,activeYear);

            return `
              <tr class="${row.activa?'season-current-row':''}">
                <td>
                  <strong>${row.anio}</strong>
                  ${history ? `<small class="season-provisional" title="${summary?.observaciones || ''}">${history}</small>` : ''}
                </td>
                <td><span class="admin-status ${state.className}">${state.label}</span></td>
                <td><strong>${money(row.cuota_anual)}</strong></td>
                <td>${money(summary?.arrastre_inicial)}</td>
                <td class="positive-text"><strong>${money(prizes)}</strong></td>
                <td><strong>${money(total)}</strong></td>
                <td>${money(summary?.gastos_salidas)}</td>
                <td><strong>${money(summary?.saldo_final)}</strong></td>
                <td>
                  ${prepared ? `
                    <button class="admin-mini-action ${canActivate?'':'season-action-disabled'}"
                      type="button"
                      data-season-activate="${row.id}"
                      ${canActivate?'':'disabled'}
                      title="${canActivate?'Activar temporada':'Disponible desde '+dateEs(row.fecha_inicio)}">
                      Activar
                    </button>
                  ` : ''}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <p class="admin-form-help season-history-note">
      <strong>Total</strong> = arrastre + premios. <strong>Saldo final</strong> = total − salidas/cenas
      y es el importe que queda para enlazar con el año siguiente. En la temporada activa representa el saldo actual.
    </p>
  `;

  container.querySelectorAll('[data-season-activate]').forEach((button)=>{
    button.addEventListener('click',()=>{
      if (!button.disabled) onActivate?.(button.dataset.seasonActivate);
    });
  });
}
