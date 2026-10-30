import { getPublicSnapshot } from '../services/public-data.js?v=20261030-03';
import { initNavigation } from '../ui/navigation.js?v=20261030-01';
import { renderCombinations } from '../modules/numeros.js?v=20261022-06';
import { renderMonthlyAwards,monthlyAwardsFromMovements,applyBalanceSummary } from '../modules/premios.js?v=20261022-06';
import { renderPublicDraws } from '../modules/sorteos.js?v=20261022-06';
import { renderHistory } from '../modules/historico.js?v=20261022-06';
import { renderRules } from '../modules/normas.js?v=20261030-01';
import { applySeason } from '../modules/temporada.js?v=20261022-06';
import { renderWeekHeading,renderPortada } from '../modules/portada.js?v=20261030-02';

function showError(){
  document.querySelectorAll('#homeActivePrograms,#homeWeeklyDraws,#combinations,#publicDrawHistory,#historyList,#monthlyAwards').forEach(el=>{
    el.innerHTML='<p class="latest-empty">No se pudieron cargar los datos. Comprueba tu conexión y vuelve a abrir la web.</p>';
  });
}
let refreshing=false;
async function hydrate(){
  if(refreshing)return;
  refreshing=true;
  try{
    const data=await getPublicSnapshot();
    if(!data){showError();return;}
    applySeason(data.season);
    renderCombinations(data.fixedPlays,data.combinations,data.games);
    applyBalanceSummary(data.currentBalance);
    renderPublicDraws(data);
    renderPortada(data);
    renderMonthlyAwards(monthlyAwardsFromMovements(data.movements));
    renderHistory(data.history,data.season.anio);
  }catch(error){
    console.error('Error al cargar la web pública:',error);
    showError();
  }finally{
    refreshing=false;
  }
}
initNavigation();
renderWeekHeading();
renderRules();
hydrate();

document.addEventListener('visibilitychange',()=>{
  // Al volver de administración, mostrar de inmediato los reintegros y premios recién guardados.
  if(!document.hidden)hydrate();
});
window.addEventListener('pageshow',event=>{
  if(event.persisted)hydrate();
});
