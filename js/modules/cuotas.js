import { money } from '../utils/format.js?v=20261022-02';

export function renderMembers() {
  const container = document.querySelector('#members');
  if (!container) return;

  container.innerHTML = `
    <article class="section-card compact">
      <p class="muted no-margin">
        El detalle individual de cuotas y pagos es privado y se consulta desde la zona de administración.
      </p>
    </article>
  `;
}

function setText(selector,value) {
  document.querySelectorAll(selector).forEach((element)=>{
    element.textContent=value;
  });
}

export function applyQuotaSummary(summary) {
  if (!summary) return;

  const active=Number(summary.socios_activos || 0);
  const current=Number(summary.socios_al_corriente || 0);
  const pendingMembers=Number(summary.socios_pendientes || 0);
  const expected=Number(summary.previsto || 0);
  const paid=Number(summary.cobrado || 0);
  const pending=Number(summary.pendiente || 0);
  const future=Number(summary.adelantado_futuro || 0);
  const spent=Number(summary.jugado_con_cuotas || 0);
  const available=Number(summary.disponible || 0);
  const percent=expected ? Math.min(100,Math.round((paid/expected)*100)) : 0;

  setText('[data-active-members]',String(active));
  setText('[data-members-current]',`${current}/${active}`);
  setText('[data-members-current-count]',String(current));
  setText('[data-members-pending-count]',String(pendingMembers));
  setText('[data-quota-expected]',money(expected));
  setText('[data-quota-paid]',money(paid));
  setText('[data-quota-pending]',money(pending));
  setText('[data-quota-future]',money(future));
  setText('[data-quota-spent]',money(spent));
  setText('[data-quota-available]',money(available));
  setText('[data-quota-percent]',`${percent}%`);

  document.querySelectorAll('[data-quota-progress]').forEach((element)=>{
    element.style.width=`${percent}%`;
  });

  document.querySelectorAll('[data-quota-status-text]').forEach((element)=>{
    element.textContent=pendingMembers
      ? `${pendingMembers} socio${pendingMembers===1?'':'s'} pendiente${pendingMembers===1?'':'s'}.`
      : 'Todos los socios están al corriente.';
  });

  document.querySelectorAll('[data-quota-future-note]').forEach((element)=>{
    element.textContent=future
      ? `Hay ${money(future)} adelantados para la próxima temporada.`
      : 'No hay saldos adelantados para la próxima temporada.';
  });
}

export function initQuotaFilters() {
  // El detalle individual no se expone en la web pública.
}
