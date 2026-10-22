import { bootstrapAdmin } from './bootstrap.js';
import { adminSelect } from '../services/admin-api.js?v=20261021-22';

function money(value) {
  if (value === null || value === undefined || value === '') return '—';
  return Number(value).toLocaleString('es-ES',{
    useGrouping:'always',
    minimumFractionDigits:2,
    maximumFractionDigits:2
  }) + ' €';
}

async function loadDashboard() {
  const context = await bootstrapAdmin();
  if (!context) return;

  try {
    const [socios, seasons] = await Promise.all([
      adminSelect('socios?select=id,fecha_baja'),
      adminSelect('temporadas?select=id,anio,activa&order=anio.desc')
    ]);

    const activeSeason = seasons.find((row) => row.activa) || null;

    const [quotaRows, summaryRows] = activeSeason
      ? await Promise.all([
          adminSelect(
            `resumen_cuotas_publico?select=temporada_id,cobrado,jugado_con_cuotas&temporada_id=eq.${activeSeason.id}&limit=1`
          ),
          adminSelect(
            `resumen_anual?select=anio,saldo_final&anio=eq.${activeSeason.anio}&limit=1`
          )
        ])
      : [[], []];

    const activeMembers = socios.filter((row) => !row.fecha_baja).length;
    const quota = quotaRows[0] || null;
    const summary = summaryRows[0] || null;

    document.querySelector('[data-kpi-socios]').textContent = activeMembers;

    const quotaLabel = document.querySelector('[data-kpi-cuotas-label]');
    if (quotaLabel) {
      quotaLabel.textContent = activeSeason
        ? `Cuotas ${activeSeason.anio} (lo cobrado)`
        : 'Cuotas (lo cobrado)';
    }

    document.querySelector('[data-kpi-cuotas]').textContent =
      quota ? money(quota.cobrado) : '—';

    document.querySelector('[data-kpi-gastado]').textContent =
      quota ? money(quota.jugado_con_cuotas) : '—';

    document.querySelector('[data-kpi-bote]').textContent =
      summary ? money(summary.saldo_final) : '—';
  } catch (error) {
    const box = document.querySelector('#dashboardError');
    box.textContent = error.message;
    box.classList.add('visible');
  }
}

loadDashboard();
