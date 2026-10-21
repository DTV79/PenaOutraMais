import { bootstrapAdmin } from '../app/bootstrap.js';
import { adminSelect } from '../services/admin-api.js';

async function loadAwards() {
  if (!await bootstrapAdmin()) return;
  const summaryBox = document.querySelector('#awardsSummary');
  const movementsBox = document.querySelector('#awardsMovements');

  try {
    const seasons = await adminSelect('temporadas?select=id,anio,activa&activa=eq.true&limit=1');
    const season = seasons[0];
    if (!season) throw new Error('No hay temporada activa');

    const [summary, movements] = await Promise.all([
      adminSelect(`resumen_anual?select=*&anio=eq.${season.anio}&limit=1`),
      adminSelect(`movimientos_bote?select=id,fecha,mes,tipo,concepto,importe,observaciones&anio=eq.${season.anio}&order=id.desc`)
    ]);

    const current = summary[0];
    summaryBox.innerHTML = current ? `
      <div class="admin-kpi"><small>Arrastre</small><strong>${Number(current.arrastre_inicial).toLocaleString('es-ES',{minimumFractionDigits:2})} €</strong></div>
      <div class="admin-kpi"><small>Premios</small><strong>${Number(current.premios_ordinarios).toLocaleString('es-ES',{minimumFractionDigits:2})} €</strong></div>
      <div class="admin-kpi"><small>Gastos</small><strong>${Number(current.gastos_salidas).toLocaleString('es-ES',{minimumFractionDigits:2})} €</strong></div>
      <div class="admin-kpi"><small>Saldo</small><strong>${Number(current.saldo_final).toLocaleString('es-ES',{minimumFractionDigits:2})} €</strong></div>
    ` : '';

    movementsBox.innerHTML = movements.length ? `
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>Tipo</th><th>Concepto</th><th>Importe</th></tr></thead>
        <tbody>${movements.map((row)=>`
          <tr><td>${row.tipo}</td><td>${row.concepto}</td><td><strong>${Number(row.importe).toLocaleString('es-ES',{minimumFractionDigits:2})} €</strong></td></tr>
        `).join('')}</tbody>
      </table></div>
    ` : '<div class="admin-empty"><span>★</span><strong>Sin movimientos</strong></div>';
  } catch (error) {
    movementsBox.innerHTML = `<div class="admin-error visible">${error.message}</div>`;
  }
}

loadAwards();
