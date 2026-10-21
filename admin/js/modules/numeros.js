import { bootstrapAdmin } from '../app/bootstrap.js';
import { adminSelect } from '../services/admin-api.js';

async function loadNumbers() {
  if (!await bootstrapAdmin()) return;
  const container = document.querySelector('#numbersAdmin');

  try {
    const seasons = await adminSelect('temporadas?select=id,anio,activa&activa=eq.true&limit=1');
    const season = seasons[0];
    if (!season) throw new Error('No hay temporada activa');

    const rows = await adminSelect(
      `combinaciones?select=id,numero_orden,nombre,numeros,activa&temporada_id=eq.${season.id}&order=numero_orden.asc`
    );

    container.innerHTML = rows.map((row)=>`
      <article class="admin-card">
        <span class="admin-card-icon">${row.numero_orden}</span>
        <strong>${row.nombre}</strong>
        <small>${row.numeros.join(' · ')}</small>
      </article>
    `).join('');
  } catch (error) {
    container.innerHTML = `<div class="admin-error visible">${error.message}</div>`;
  }
}

loadNumbers();
