const MONTHS=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function money(value) {
  return Number(value || 0).toLocaleString('es-ES',{
    minimumFractionDigits:2,
    maximumFractionDigits:2
  }) + ' €';
}

export function renderAwardsSummary({ season, summary, movements }) {
  const box = document.querySelector('#awardsSummary');
  const monthly = document.querySelector('#awardsMonthly');
  if (!season) return;

  box.innerHTML = `
    <article class="admin-kpi"><small>Arrastre</small><strong>${money(summary?.arrastre_inicial)}</strong></article>
    <article class="admin-kpi"><small>Premios</small><strong>${money(summary?.premios_ordinarios)}</strong></article>
    <article class="admin-kpi"><small>Gastos / salidas</small><strong>${money(summary?.gastos_salidas)}</strong></article>
    <article class="admin-kpi"><small>Bote actual</small><strong>${money(summary?.saldo_final)}</strong></article>
  `;

  const valid = movements.filter((row) => !row.anulado_at && row.tipo === 'premio');
  const values = Array.from({length:12}, () => 0);
  valid.forEach((row) => {
    if (row.mes) values[row.mes-1] += Number(row.importe);
  });

  monthly.innerHTML = values.map((value,index) => `
    <div class="award-month-row">
      <span>${MONTHS[index]}</span>
      <div class="award-month-track"><i style="width:${value ? 100 : 0}%"></i></div>
      <strong>${money(value)}</strong>
    </div>
  `).join('');
}
