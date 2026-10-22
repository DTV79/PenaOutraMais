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

function todayIso() {
  const now=new Date();
  const local=new Date(now.getTime()-now.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
}

function seasonValues(row) {
  const summary=row.summary;
  const prizes=summary
    ? Number(summary.premios_ordinarios || 0)+Number(summary.premios_extra || 0)
    : null;
  const total=summary
    ? Number(summary.arrastre_inicial || 0)+Number(prizes || 0)
    : null;

  return { summary, prizes, total };
}

function preparedCard(row) {
  const stats=row.preparedStats || {};
  const canActivate=todayIso()>=row.fecha_inicio;

  return `
    <article class="season-prepared-card">
      <div class="season-prepared-main">
        <div>
          <p class="eyebrow">PRÓXIMA TEMPORADA</p>
          <div class="season-prepared-title">
            <h3>${row.anio}</h3>
            <span class="admin-status pending">Preparada</span>
          </div>
          <p class="season-prepared-date">
            Del ${dateEs(row.fecha_inicio)} al ${dateEs(row.fecha_fin)}
          </p>
        </div>

        <button class="admin-action ${canActivate?'':'season-action-disabled'}"
          type="button"
          data-season-activate="${row.id}"
          ${canActivate?'':'disabled'}
          title="${canActivate?'Activar temporada':'Disponible desde '+dateEs(row.fecha_inicio)}">
          Activar temporada
        </button>
      </div>

      <div class="season-prepared-stats">
        <div><small>Cuota anual</small><strong>${money(row.cuota_anual)}</strong></div>
        <div><small>Jugadas fijas</small><strong>${stats.fixedPlays ?? 0}</strong></div>
        <div><small>Combinaciones</small><strong>${stats.combinations ?? 0}</strong></div>
        <div><small>Apuestas programadas</small><strong>${stats.programs ?? 0}</strong></div>
      </div>

      <p class="season-prepared-help">
        ${canActivate
          ? `Ya puede activarse. Al hacerlo, ${row.anio-1} se cerrará y su saldo final pasará como arrastre inicial de ${row.anio}.`
          : `Disponible para activar desde el ${dateEs(row.fecha_inicio)}. Hasta entonces la temporada actual seguirá funcionando sin cambios.`}
      </p>
    </article>
  `;
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

  const preparedRows=rows.filter(
    (row)=>!row.activa && Number(row.anio)>Number(activeYear)
  );
  const tableRows=rows.filter(
    (row)=>row.activa || Number(row.anio)<Number(activeYear)
  );
  const historicalCount=tableRows.filter(
    (row)=>Number(row.anio)<Number(activeYear)
  ).length;
  const currentBalance=active?.summary?.saldo_final ?? null;

  container.innerHTML=`
    ${preparedRows.length ? `
      <div class="season-prepared-list">
        ${preparedRows.map(preparedCard).join('')}
      </div>
    ` : ''}

    <div class="season-summary-strip">
      <div><small>Temporada activa</small><strong>${activeYear}</strong></div>
      <div><small>Saldo actual</small><strong>${money(currentBalance)}</strong></div>
      <div><small>Años jugados</small><strong>${historicalCount}</strong></div>
    </div>

    <div class="season-mobile-list">
      ${tableRows.map((row)=>{
        const { summary, prizes, total }=seasonValues(row);
        const state=stateOf(row,activeYear);
        const history=historyLabel(row,activeYear);

        return `
          <article class="season-mobile-card ${row.activa?'current':''}">
            <div class="season-mobile-head">
              <div>
                <strong class="season-mobile-year">${row.anio}</strong>
                ${history ? '<small>Histórico</small>' : ''}
              </div>
              <span class="admin-status ${state.className}">${state.label}</span>
            </div>

            <div class="season-mobile-grid">
              <div><small>Cuota anual</small><strong>${money(row.cuota_anual)}</strong></div>
              <div><small>Arrastre</small><strong>${money(summary?.arrastre_inicial)}</strong></div>
              <div><small>Premios</small><strong class="positive-text">${money(prizes)}</strong></div>
              <div><small>Total</small><strong>${money(total)}</strong></div>
              <div><small>Salidas / cenas</small><strong>${money(summary?.gastos_salidas)}</strong></div>
              <div class="season-mobile-balance"><small>Saldo final</small><strong>${money(summary?.saldo_final)}</strong></div>
            </div>
          </article>
        `;
      }).join('')}
    </div>

    <div class="admin-table-wrap season-desktop-table">
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
          </tr>
        </thead>
        <tbody>
          ${tableRows.map((row)=>{
            const { summary, prizes, total }=seasonValues(row);
            const state=stateOf(row,activeYear);
            const history=historyLabel(row,activeYear);

            return `
              <tr class="${row.activa?'season-current-row':''}">
                <td>
                  <strong>${row.anio}</strong>
                  ${history ? `<small class="season-provisional">Histórico</small>` : ''}
                </td>
                <td><span class="admin-status ${state.className}">${state.label}</span></td>
                <td><strong>${money(row.cuota_anual)}</strong></td>
                <td>${money(summary?.arrastre_inicial)}</td>
                <td class="positive-text"><strong>${money(prizes)}</strong></td>
                <td><strong>${money(total)}</strong></td>
                <td>${money(summary?.gastos_salidas)}</td>
                <td><strong>${money(summary?.saldo_final)}</strong></td>
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
