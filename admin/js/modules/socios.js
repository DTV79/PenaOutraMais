import { bootstrapAdmin } from '../app/bootstrap.js';
import { adminSelect } from '../services/admin-api.js';

async function loadMembers() {
  if (!await bootstrapAdmin()) return;

  const container = document.querySelector('#membersAdmin');

  try {
    const rows = await adminSelect(
      'socios?select=id,nombre,apellidos,alias,telefono,email,fecha_alta,fecha_baja&order=alias.asc'
    );

    if (!rows.length) {
      container.innerHTML = `
        <div class="admin-empty">
          <span>◎</span><strong>Todavía no hay socios cargados</strong>
          <p>El siguiente paso será importar los 20 socios reales y habilitar altas, edición y bajas.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Alias</th><th>Nombre</th><th>Alta</th><th>Estado</th><th>Contacto</th></tr></thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td><strong>${row.alias}</strong></td>
                <td>${row.nombre} ${row.apellidos}</td>
                <td>${row.fecha_alta || '—'}</td>
                <td><span class="admin-status ${row.fecha_baja ? 'off' : 'ok'}">${row.fecha_baja ? 'Baja' : 'Activo'}</span></td>
                <td>${row.telefono || row.email || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="admin-error visible">${error.message}</div>`;
  }
}

loadMembers();
