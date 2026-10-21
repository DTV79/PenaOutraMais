import { fallbackMonthlyAwards, monthLabels } from '../data/fallback.js';
import { money, formatNumber } from '../utils/format.js';

export function renderMonthlyAwards(values = fallbackMonthlyAwards) {
  const container = document.querySelector('#monthlyAwards');
  if (!container) return;

  container.innerHTML = values.map((value, index) => `
    <div class="monthly-row">
      <span>${monthLabels[index]}</span>
      <div class="monthly-track"><i style="width:${value ? 100 : 0}%"></i></div>
      <strong>${money(value)}</strong>
    </div>
  `).join('');
}

export function monthlyAwardsFromMovements(movements = []) {
  const monthly = Array.from({ length: 12 }, () => 0);

  movements
    .filter((movement) => movement.tipo === 'premio' && movement.mes)
    .forEach((movement) => {
      monthly[movement.mes - 1] += Number(movement.importe);
    });

  return monthly;
}

export function applyBalanceSummary(current) {
  if (!current) return;

  document.querySelectorAll('[data-current-balance]').forEach((element) => {
    element.textContent = formatNumber(current.saldo_final);
  });

  document.querySelectorAll('[data-carryover]').forEach((element) => {
    element.textContent = money(current.arrastre_inicial);
  });

  document.querySelectorAll('[data-year-awards]').forEach((element) => {
    element.textContent = money(current.premios_ordinarios);
  });

  document.querySelectorAll('[data-year-awards-short]').forEach((element) => {
    element.textContent = Number(current.premios_ordinarios).toLocaleString('es-ES') + ' €';
  });
}
