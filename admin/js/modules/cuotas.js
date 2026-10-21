import { bootstrapAdmin } from '../app/bootstrap.js';
import { adminSelect } from '../services/admin-api.js';

async function loadFees() {
  if (!await bootstrapAdmin()) return;
  const container = document.querySelector('#feesAdmin');

  try {
    const rows = await adminSelect(
      'movimientos_cuotas?select=id,socio_id,fecha,importe,tipo,metodo,observaciones&order=fecha.desc'
    );

    if (!rows.length) {
      container.innerHTML = `
        <div class="admin-empty">
          <span>€</span><strong>Sin movimientos de cuotas</strong>
          <p>Esta tabla empezará a llenarse cuando migremos los pagos reales de 2026.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>Fecha</th><th>Socio</th><th>Tipo</th><th>Método</th><th>Importe</th></tr></thead>
        <tbody>${rows.map((row)=>`
          <tr><td>${row.fecha}</td><td>${row.socio_id}</td><td>${row.tipo}</td><td>${row.metodo || '—'}</td><td><strong>${Number(row.importe).toLocaleString('es-ES',{minimumFractionDigits:2})} €</strong></td></tr>
        `).join('')}</tbody>
      </table></div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="admin-error visible">${error.message}</div>`;
  }
}

loadFees();
