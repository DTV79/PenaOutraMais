import { bootstrapAdmin } from '../app/bootstrap.js';
import { adminSelect } from '../services/admin-api.js';

async function loadSeasons() {
  if (!await bootstrapAdmin()) return;
  const container = document.querySelector('#seasonsAdmin');

  try {
    const rows = await adminSelect(
      'temporadas?select=id,anio,fecha_inicio,fecha_fin,cuota_semanal,numero_semanas,cuota_anual,activa,observaciones&order=anio.desc'
    );

    container.innerHTML = `
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>Año</th><th>Cuota semanal</th><th>Semanas</th><th>Cuota anual</th><th>Estado</th></tr></thead>
        <tbody>${rows.map((row)=>`
          <tr>
            <td><strong>${row.anio}</strong></td>
            <td>${Number(row.cuota_semanal).toLocaleString('es-ES')} €</td>
            <td>${row.numero_semanas}</td>
            <td>${Number(row.cuota_anual).toLocaleString('es-ES')} €</td>
            <td><span class="admin-status ${row.activa ? 'ok' : 'off'}">${row.activa ? 'Activa' : 'Cerrada'}</span></td>
          </tr>
        `).join('')}</tbody>
      </table></div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="admin-error visible">${error.message}</div>`;
  }
}

loadSeasons();
