import { bootstrapAdmin } from './bootstrap.js';
import { adminSelect } from '../services/admin-api.js?v=20261021-22';

function money(value) {
  return Number(value || 0).toLocaleString('es-ES',{
    useGrouping:'always',
    minimumFractionDigits:2,
    maximumFractionDigits:2
  }) + ' €';
}

async function getDashboardSnapshot() {
  const seasons=await adminSelect(
    'temporadas?select=id,anio,activa&activa=eq.true&limit=1'
  );
  const season=seasons[0] || null;

  if (!season) {
    return {
      season:null,
      activeMembers:0,
      quotaCollected:0,
      quotaSpent:0,
      pot:0
    };
  }

  const [members,quotaRows,balanceRows]=await Promise.all([
    adminSelect('socios?select=id,fecha_baja'),
    adminSelect(
      `resumen_cuotas_publico?select=cobrado,jugado_con_cuotas&temporada_id=eq.${season.id}&limit=1`
    ),
    adminSelect(
      `resumen_anual?select=saldo_final&anio=eq.${season.anio}&limit=1`
    )
  ]);

  return {
    season,
    activeMembers:members.filter((row)=>!row.fecha_baja).length,
    quotaCollected:Number(quotaRows?.[0]?.cobrado || 0),
    quotaSpent:Number(quotaRows?.[0]?.jugado_con_cuotas || 0),
    pot:Number(balanceRows?.[0]?.saldo_final || 0)
  };
}

function renderDashboard(snapshot) {
  const box=document.querySelector('#dashboardSummary');
  if (!box) return;

  if (!snapshot.season) {
    box.innerHTML='<div class="admin-error visible">No hay una temporada activa.</div>';
    return;
  }

  box.innerHTML=`
    <article class="admin-kpi">
      <small>Socios activos</small>
      <strong>${snapshot.activeMembers}</strong>
    </article>
    <article class="admin-kpi">
      <small>Cuotas ${snapshot.season.anio} (lo cobrado)</small>
      <strong>${money(snapshot.quotaCollected)}</strong>
    </article>
    <article class="admin-kpi">
      <small>Gastado</small>
      <strong>${money(snapshot.quotaSpent)}</strong>
    </article>
    <article class="admin-kpi">
      <small>Bote</small>
      <strong>${money(snapshot.pot)}</strong>
    </article>
  `;
}

async function init() {
  if (!await bootstrapAdmin()) return;

  try {
    const snapshot=await getDashboardSnapshot();
    renderDashboard(snapshot);
  } catch(error) {
    const box=document.querySelector('#dashboardSummary');
    if (box) {
      box.innerHTML=`<div class="admin-error visible">${error?.message || error}</div>`;
    }
  }
}

init();
