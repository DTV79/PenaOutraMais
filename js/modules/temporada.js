export function applySeason(season) {
  if (!season) return;

  document.querySelectorAll('[data-season-year]').forEach((element) => {
    element.textContent = season.anio;
  });

  document.querySelectorAll('[data-weekly-fee]').forEach((element) => {
    element.textContent = Number(season.cuota_semanal).toLocaleString('es-ES',{useGrouping:'always'}) + ' €';
  });

  document.querySelectorAll('[data-annual-fee]').forEach((element) => {
    element.textContent = Number(season.cuota_anual).toLocaleString('es-ES',{useGrouping:'always'}) + ' €';
  });
}
