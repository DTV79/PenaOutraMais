import { bootstrapAdmin } from './bootstrap.js';
import { adminSelect } from '../services/admin-api.js?v=20261021-22';

async function loadDashboard() {
  const context = await bootstrapAdmin();
  if (!context) return;

  try {
    const [socios, seasons, combinations, summary] = await Promise.all([
      adminSelect('socios?select=id,fecha_baja'),
      adminSelect('temporadas?select=id,anio,activa&order=anio.desc'),
      adminSelect('combinaciones?select=id,activa'),
      adminSelect('resumen_anual?select=anio,saldo_final&order=anio.desc&limit=1')
    ]);

    const activeMembers = socios.filter((row) => !row.fecha_baja).length;
    document.querySelector('[data-kpi-socios]').textContent = activeMembers;
    document.querySelector('[data-kpi-temporada]').textContent = seasons.find((row) => row.activa)?.anio || '—';
    document.querySelector('[data-kpi-combinaciones]').textContent = combinations.filter((row) => row.activa).length;
    document.querySelector('[data-kpi-bote]').textContent = summary[0]
      ? Number(summary[0].saldo_final).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}) + ' €'
      : '—';
  } catch (error) {
    const box = document.querySelector('#dashboardError');
    box.textContent = error.message;
    box.classList.add('visible');
  }
}

loadDashboard();
