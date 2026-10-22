import { fallbackHistory } from '../data/fallback.js';
import { money } from '../utils/format.js?v=20261022-02';

function normalizeHistory(rows) {
  if (!rows?.length) {
    return fallbackHistory.map((row) => ({
      anio: row.year,
      arrastre_inicial: row.start,
      premios_ordinarios: row.awards,
      gastos_salidas: row.spent,
      premios_extra: row.extra,
      saldo_final: row.end,
      observaciones: row.note,
      provisional: false
    }));
  }

  return rows;
}

export function renderHistory(rows, currentYear = 2026) {
  const container = document.querySelector('#historyList');
  if (!container) return;

  container.innerHTML = normalizeHistory(rows).map((row, index) => `
    <details class="history-year" ${index === 0 ? 'open' : ''}>
      <summary>
        <span class="year-badge">${row.anio}</span>
        <span class="year-title">
          <strong>${row.anio === currentYear ? 'Temporada actual' : 'Temporada ' + row.anio}</strong>
          <small>
            ${row.observaciones || 'Resumen anual'}
            ${row.provisional ? ' · pendiente de revisión' : ''}
          </small>
        </span>
        <span class="year-total">
          <strong>${money(row.saldo_final)}</strong>
          <small>saldo final</small>
        </span>
      </summary>
      <div class="year-details">
        <div><span>Arrastre inicial</span><strong>${money(row.arrastre_inicial)}</strong></div>
        <div><span>Premios del año</span><strong class="green">+${money(row.premios_ordinarios)}</strong></div>
        <div><span>Gastos / salidas</span><strong class="red">${Number(row.gastos_salidas) ? '-' + money(row.gastos_salidas) : money(0)}</strong></div>
        <div><span>Premio extra</span><strong class="green">${Number(row.premios_extra) ? '+' + money(row.premios_extra) : money(0)}</strong></div>
        ${row.observaciones ? `<div class="wide"><span>Observación</span><strong>${row.observaciones}</strong></div>` : ''}
      </div>
    </details>
  `).join('');
}
