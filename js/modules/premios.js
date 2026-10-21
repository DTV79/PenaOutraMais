import { fallbackMonthlyAwards, monthLabels } from '../data/fallback.js';
import { money, formatNumber } from '../utils/format.js';

function esc(value='') {
  return String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function formatDate(value) {
  if (!value) return '—';
  const [y,m,d]=String(value).split('-');
  return `${d}/${m}/${y}`;
}

export function renderMonthlyAwards(values = fallbackMonthlyAwards) {
  const container = document.querySelector('#monthlyAwards');
  if (container) {
    const max=Math.max(1,...values.map(Number));
    container.innerHTML = values.map((value, index) => `
      <div class="monthly-row">
        <span>${monthLabels[index]}</span>
        <div class="monthly-track"><i style="width:${Math.round((Number(value || 0)/max)*100)}%"></i></div>
        <strong>${money(value)}</strong>
      </div>
    `).join('');
  }

  const home=document.querySelector('#homeMonthBars');
  if (home) {
    const max=Math.max(1,...values.map(Number));
    home.innerHTML=values.map((value,index)=>`
      <div>
        <span>${monthLabels[index]}</span>
        <i><b style="height:${Math.round((Number(value || 0)/max)*100)}%"></b></i>
        <strong>${Number(value || 0).toLocaleString('es-ES',{maximumFractionDigits:2})} €</strong>
      </div>
    `).join('');
  }
}

export function monthlyAwardsFromMovements(movements = []) {
  const monthly = Array.from({ length: 12 }, () => 0);

  movements
    .filter((movement) => ['premio','premio_extra'].includes(movement.tipo) && movement.mes)
    .forEach((movement) => {
      monthly[movement.mes - 1] += Number(movement.importe);
    });

  return monthly;
}

export function applyBalanceSummary(current) {
  if (!current) return;

  const prizes=Number(current.premios_ordinarios || 0)+Number(current.premios_extra || 0);
  const expenses=Number(current.gastos_salidas || 0);

  document.querySelectorAll('[data-current-balance]').forEach((element) => {
    element.textContent = formatNumber(current.saldo_final);
  });

  document.querySelectorAll('[data-carryover]').forEach((element) => {
    element.textContent = money(current.arrastre_inicial);
  });

  document.querySelectorAll('[data-year-awards]').forEach((element) => {
    element.textContent = money(prizes);
  });

  document.querySelectorAll('[data-year-awards-short]').forEach((element) => {
    element.textContent = Number(prizes).toLocaleString('es-ES',{maximumFractionDigits:2}) + ' €';
  });

  document.querySelectorAll('[data-year-expenses]').forEach((element) => {
    element.textContent = money(expenses);
  });
}

export function renderPublicMovements(movements = []) {
  const container=document.querySelector('#publicBoteMovements');
  if (!container) return;

  if (!movements.length) {
    container.innerHTML='<div class="empty-state"><span>◎</span><p>No hay movimientos registrados.</p></div>';
    return;
  }

  container.innerHTML=movements.slice(0,30).map((row)=>{
    const positive=Number(row.importe)>=0;
    return `
      <div class="movement ${positive?'positive':'negative'}">
        <span class="movement-icon">${positive?'+':'−'}</span>
        <div>
          <strong>${esc(row.concepto)}</strong>
          <small>${formatDate(row.fecha)}${row.observaciones?' · '+esc(row.observaciones):''}</small>
        </div>
        <b>${positive?'+':''}${money(row.importe)}</b>
      </div>
    `;
  }).join('');
}
