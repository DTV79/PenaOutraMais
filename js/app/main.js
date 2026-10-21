import { getPublicSnapshot } from '../services/public-data.js?v=20261021-7';
import { initNavigation } from '../ui/navigation.js?v=20261021-7';
import { renderCombinations } from '../modules/numeros.js?v=20261021-7';
import { renderMembers, initQuotaFilters, applyQuotaSummary } from '../modules/cuotas.js?v=20261021-7';
import {
  renderMonthlyAwards,
  monthlyAwardsFromMovements,
  applyBalanceSummary,
  renderPublicMovements
} from '../modules/premios.js?v=20261021-7';
import { renderPublicPrograms, renderPublicDraws } from '../modules/sorteos.js?v=20261021-7';
import { renderHistory } from '../modules/historico.js?v=20261021-7';
import { renderRules } from '../modules/normas.js?v=20261021-7';
import { applySeason } from '../modules/temporada.js?v=20261021-7';

function renderFallbacks() {
  renderCombinations();
  renderMembers();
  renderMonthlyAwards();
  renderHistory();
  renderRules();
}

async function hydrateFromSupabase() {
  try {
    const snapshot = await getPublicSnapshot();
    if (!snapshot) return;

    applySeason(snapshot.season);
    renderCombinations(snapshot.combinations);
    renderHistory(snapshot.history, snapshot.season.anio);
    applyBalanceSummary(snapshot.currentBalance);
    applyQuotaSummary(snapshot.quotaSummary);
    renderPublicMovements(snapshot.movements);
    renderPublicPrograms(snapshot.programs,snapshot.games);
    renderPublicDraws(snapshot);

    renderMonthlyAwards(
      monthlyAwardsFromMovements(snapshot.movements)
    );
  } catch (error) {
    console.warn('Se mantienen los datos locales de respaldo.', error);
  }
}

function init() {
  renderFallbacks();
  initNavigation();
  initQuotaFilters();
  hydrateFromSupabase();
}

init();
