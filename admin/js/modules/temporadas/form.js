import { openModal, closeModal } from '../../ui/modal.js';

function esc(value='') {
  return String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('"','&quot;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
}

export function openSeasonForm({ activeSeason, onSave }) {
  const nextYear=Number(activeSeason?.anio || new Date().getFullYear())+1;
  const weekly=Number(activeSeason?.cuota_semanal ?? 1);
  const weeks=Number(activeSeason?.numero_semanas ?? 52);

  const modal=openModal({
    title:'Nueva temporada',
    subtitle:'AÑOS',
    content:`
      <form id="seasonForm" class="admin-form">
        <div class="admin-form-grid">
          <div class="admin-form-field">
            <label for="season-year">Año *</label>
            <input id="season-year" name="anio" type="number" min="${nextYear}" max="2100"
              value="${nextYear}" required />
          </div>

          <div class="admin-form-field">
            <label for="season-weekly">Cuota semanal *</label>
            <input id="season-weekly" name="cuota_semanal" type="number" min="0" step="0.01"
              value="${weekly.toFixed(2)}" required />
          </div>

          <div class="admin-form-field">
            <label for="season-start">Fecha inicio *</label>
            <input id="season-start" name="fecha_inicio" type="date"
              value="${nextYear}-01-01" required />
          </div>

          <div class="admin-form-field">
            <label for="season-end">Fecha fin *</label>
            <input id="season-end" name="fecha_fin" type="date"
              value="${nextYear}-12-31" required />
          </div>

          <div class="admin-form-field">
            <label for="season-weeks">Semanas *</label>
            <input id="season-weeks" name="numero_semanas" type="number" min="1" max="53"
              value="${weeks}" required />
          </div>

          <div class="admin-form-field season-annual-preview">
            <label>Cuota anual</label>
            <strong id="seasonAnnualPreview">${(weekly*weeks).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €</strong>
          </div>

          <label class="admin-check-row admin-form-wide">
            <input name="copiar_combinaciones" type="checkbox" checked />
            <span>
              <strong>Copiar combinaciones</strong>
              <small>Copiar las combinaciones activas de ${activeSeason?.anio || ''}.</small>
            </span>
          </label>

          <label class="admin-check-row admin-form-wide">
            <input name="copiar_programaciones" type="checkbox" checked />
            <span>
              <strong>Copiar apuestas programadas</strong>
              <small>Se preparan para el nuevo año, pero no generarán sorteos hasta que la temporada esté activa.</small>
            </span>
          </label>

          <div class="admin-form-field admin-form-wide">
            <label for="season-notes">Observaciones</label>
            <textarea id="season-notes" name="observaciones" rows="2"
              placeholder="Opcional"></textarea>
          </div>
        </div>

        <p class="admin-form-help">
          Crear la temporada no cierra la actual. Quedará como <strong>Preparada</strong> hasta su fecha de inicio.
        </p>
        <div id="seasonFormError" class="admin-error"></div>
      </form>
    `,
    actions:`
      <button class="admin-action secondary" type="button" data-modal-close>Cancelar</button>
      <button class="admin-action" type="submit" form="seasonForm" id="seasonSave">Crear temporada</button>
    `
  });

  const form=modal.querySelector('#seasonForm');
  const save=modal.querySelector('#seasonSave');
  const errorBox=modal.querySelector('#seasonFormError');
  const yearInput=modal.querySelector('#season-year');
  const startInput=modal.querySelector('#season-start');
  const endInput=modal.querySelector('#season-end');
  const weeklyInput=modal.querySelector('#season-weekly');
  const weeksInput=modal.querySelector('#season-weeks');
  const preview=modal.querySelector('#seasonAnnualPreview');

  function refreshYearDates() {
    const year=Number(yearInput.value || nextYear);
    startInput.value=`${year}-01-01`;
    endInput.value=`${year}-12-31`;
  }

  function refreshAnnual() {
    const total=Number(weeklyInput.value || 0)*Number(weeksInput.value || 0);
    preview.textContent=total.toLocaleString('es-ES',{
      minimumFractionDigits:2,
      maximumFractionDigits:2
    })+' €';
  }

  yearInput.addEventListener('change',refreshYearDates);
  weeklyInput.addEventListener('input',refreshAnnual);
  weeksInput.addEventListener('input',refreshAnnual);

  form.addEventListener('submit',async(event)=>{
    event.preventDefault();
    errorBox.classList.remove('visible');
    save.disabled=true;
    save.textContent='Creando…';

    try {
      const data=new FormData(form);
      await onSave({
        anio:Number(data.get('anio')),
        fecha_inicio:String(data.get('fecha_inicio')),
        fecha_fin:String(data.get('fecha_fin')),
        cuota_semanal:Number(data.get('cuota_semanal')),
        numero_semanas:Number(data.get('numero_semanas')),
        copiar_combinaciones:data.get('copiar_combinaciones')==='on',
        copiar_programaciones:data.get('copiar_programaciones')==='on',
        observaciones:String(data.get('observaciones') || '').trim() || null
      });
      closeModal();
    } catch(error) {
      errorBox.textContent=error?.message || 'No se pudo crear la temporada.';
      errorBox.classList.add('visible');
      save.disabled=false;
      save.textContent='Crear temporada';
    }
  });
}
