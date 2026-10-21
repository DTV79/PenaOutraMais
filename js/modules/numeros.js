import { fallbackCombinations, romans } from '../data/fallback.js';

function normalizeRows(rows) {
  if (!rows?.length) {
    return fallbackCombinations.map((numeros, index) => ({
      numero_orden: index + 1,
      nombre: `Combinación ${romans[index]}`,
      numeros
    }));
  }

  return rows;
}

export function renderCombinations(rows) {
  const container = document.querySelector('#combinations');
  if (!container) return;

  container.innerHTML = normalizeRows(rows).map((row, index) => `
    <article class="combination-card">
      <div class="combination-header">
        <strong>${row.nombre || `Combinación ${romans[index] || row.numero_orden}`}</strong>
        <span>Fija</span>
      </div>
      <div class="balls">
        ${row.numeros.map((number) => `<span class="ball">${number}</span>`).join('')}
      </div>
    </article>
  `).join('');
}
