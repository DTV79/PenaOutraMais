import { getPublicSnapshot } from '../services/public-data.js';
import { initNavigation } from '../ui/navigation.js';
import { renderCombinations } from '../modules/numeros.js';
import { renderMembers, initQuotaFilters } from '../modules/cuotas.js';
import { renderMonthlyAwards, monthlyAwardsFromMovements, applyBalanceSummary } from '../modules/premios.js';
import { renderHistory } from '../modules/historico.js';
import { renderRules } from '../modules/normas.js';
import { applySeason } from '../modules/temporada.js';

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

    if (snapshot.movements?.length) {
      renderMonthlyAwards(monthlyAwardsFromMovements(snapshot.movements));
    }
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
