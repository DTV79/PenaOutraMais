import { getPublicSnapshot } from '../services/public-data.js?v=20261022-06';
import { initNavigation } from '../ui/navigation.js?v=20261022-06';
import { renderCombinations } from '../modules/numeros.js?v=20261022-06';
import { renderMembers, initQuotaFilters, applyQuotaSummary } from '../modules/cuotas.js?v=20261022-06';
import {
  renderMonthlyAwards,
  monthlyAwardsFromMovements,
  applyBalanceSummary,
  renderPublicMovements
} from '../modules/premios.js?v=20261022-06';
import { renderPublicPrograms, renderPublicDraws } from '../modules/sorteos.js?v=20261022-06';
import { renderHistory } from '../modules/historico.js?v=20261022-06';
import { renderRules } from '../modules/normas.js?v=20261023-12';
import { applySeason } from '../modules/temporada.js?v=20261022-06';

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
    renderCombinations(snapshot.fixedPlays,snapshot.combinations,snapshot.games);
    renderHistory(snapshot.history, snapshot.season.anio);
    applyBalanceSummary(snapshot.currentBalance);
    applyQuotaSummary(snapshot.quotaSummary);
    renderPublicMovements(snapshot.movements);
    renderPublicPrograms(snapshot.programs,snapshot.games,snapshot.fixedPlays,snapshot.combinations);
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
