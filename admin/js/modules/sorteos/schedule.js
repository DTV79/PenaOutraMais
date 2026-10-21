const DAYS=[
  [1,'Lun'],[2,'Mar'],[3,'Mié'],[4,'Jue'],[5,'Vie'],[6,'Sáb'],[7,'Dom']
];

export function renderSchedule(program, combinationCount, onSave) {
  const box=document.querySelector('#drawSchedule');

  if (!program) {
    box.innerHTML='<div class="admin-empty"><span>◷</span><strong>Sin programación configurada</strong></div>';
    return;
  }

  const selected=new Set((program.dias_semana || []).map(Number));

  box.innerHTML=`
    <form id="drawScheduleForm" class="draw-schedule-form">
      <div class="draw-schedule-top">
        <label class="admin-check-row schedule-toggle">
          <input name="activa" type="checkbox" ${program.activa ? 'checked' : ''} />
          <span><strong>Crear sorteos habituales automáticamente</strong><small>Solo se crearán en los días que marques.</small></span>
        </label>

        <div class="admin-form-field schedule-amount">
          <label>Importe total del sorteo</label>
          <input name="importe" type="number" min="0" step="0.01"
            value="${(Number(program.importe_por_apuesta || 0) * Number(combinationCount || 0)).toFixed(2)}" />
          <small id="scheduleAmountHelp" class="field-note"></small>
        </div>
      </div>

      <div class="weekday-grid">
        ${DAYS.map(([value,label])=>`
          <label class="weekday-option ${selected.has(value) ? 'selected' : ''}">
            <input type="checkbox" name="dia" value="${value}" ${selected.has(value) ? 'checked' : ''} />
            <span>${label}</span>
          </label>
        `).join('')}
      </div>

      <p class="admin-form-help">
        Marca exactamente los días en los que la peña juega La Primitiva.
        Los reintegros no se programan porque cambian en cada resguardo: se añaden después en cada sorteo con el botón “Reintegros”.
      </p>

      <div class="schedule-actions">
        <span id="scheduleStatus"></span>
        <button class="admin-action" type="submit">Guardar programación</button>
      </div>
    </form>
  `;

  const form=box.querySelector('#drawScheduleForm');
  const amountInput=form.querySelector('input[name="importe"]');
  const amountHelp=form.querySelector('#scheduleAmountHelp');

  function updateAmountHelp() {
    const total=Number(amountInput.value || 0);
    const perBet=combinationCount ? total / combinationCount : 0;
    amountHelp.textContent=combinationCount
      ? combinationCount + ' combinaciones × ' +
        perBet.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}) +
        ' € = ' +
        total.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}) +
        ' € por sorteo'
      : 'No hay combinaciones activas.';
  }

  amountInput.addEventListener('input',updateAmountHelp);
  updateAmountHelp();

  form.querySelectorAll('.weekday-option input').forEach((input)=>{
    input.addEventListener('change',()=>{
      input.closest('.weekday-option')?.classList.toggle('selected',input.checked);
    });
  });

  form.addEventListener('submit',async(event)=>{
    event.preventDefault();
    const button=form.querySelector('button[type="submit"]');
    const status=form.querySelector('#scheduleStatus');
    const data=new FormData(form);
    const days=data.getAll('dia').map(Number).sort((a,b)=>a-b);
    const active=data.get('activa')==='on';

    if (active && !days.length) {
      status.textContent='Selecciona al menos un día.';
      status.className='schedule-error';
      return;
    }

    button.disabled=true;
    button.textContent='Guardando…';
    status.textContent='';

    try {
      const totalAmount=Number(data.get('importe') || 0);
      const count=Number(combinationCount || 0);
      if (active && !count) throw new Error('No hay combinaciones activas.');

      await onSave({
        activa:active,
        dias_semana:days,
        importe_por_apuesta:count ? Number((totalAmount / count).toFixed(2)) : 0
      });
      status.textContent='Guardado ✓';
      status.className='schedule-ok';
    } catch(error) {
      status.textContent=error?.message || 'No se pudo guardar.';
      status.className='schedule-error';
    } finally {
      button.disabled=false;
      button.textContent='Guardar programación';
    }
  });
}
