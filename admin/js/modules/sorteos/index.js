import { bootstrapAdmin } from '../../app/bootstrap.js';
import { openModal } from '../../ui/modal.js';
import {
  getDrawsSnapshot,
  createFixedDraw,
  createSpecialBet,
  saveProgram,
  checkDraw
} from './service.js';
import { openFixedDrawForm, openSpecialBetForm } from './form.js';
import { renderDraws } from './list.js';
import { renderSchedule } from './schedule.js';

let snapshot=null;
const drawsBox=document.querySelector('#drawsAdmin');

async function refresh() {
  try {
    snapshot=await getDrawsSnapshot();
    renderDraws(snapshot);

    const program=snapshot.programs.find((row)=>row.juego_codigo==='primitiva') || null;
    renderSchedule(program,async(payload)=>{
      await saveProgram(program.id,payload);
      snapshot=await getDrawsSnapshot();
      const updated=snapshot.programs.find((row)=>row.juego_codigo==='primitiva') || null;
      renderSchedule(updated,async(next)=>saveProgram(updated.id,next));
    });
  } catch(error) {
    drawsBox.innerHTML=`<div class="admin-error visible">${error.message}</div>`;
  }
}

function showError(title,error) {
  openModal({
    title,
    content:`<div class="admin-error visible">${error?.message || error}</div>`,
    actions:'<button class="admin-action" type="button" data-modal-close>Cerrar</button>'
  });
}

async function init() {
  if (!await bootstrapAdmin()) return;

  document.querySelector('#newFixedDrawButton')?.addEventListener('click',()=>{
    if (!snapshot?.season) return;
    openFixedDrawForm({
      season:snapshot.season,
      onSave:async(payload)=>{
        await createFixedDraw(payload);
        await refresh();
      }
    });
  });

  document.querySelector('#newSpecialBetButton')?.addEventListener('click',()=>{
    if (!snapshot?.season) return;
    openSpecialBetForm({
      season:snapshot.season,
      games:snapshot.games,
      onSave:async(payload)=>{
        await createSpecialBet(payload);
        await refresh();
      }
    });
  });

  drawsBox.addEventListener('click',async(event)=>{
    const button=event.target.closest('[data-draw-check]');
    if (!button) return;

    button.disabled=true;
    const previous=button.textContent;
    button.textContent='Comprobando…';

    try {
      const result=await checkDraw(button.dataset.drawCheck);
      if (result?.resultados?.[0]?.status === 'sin_resultado') {
        showError('Resultado aún no disponible','SELAE todavía no muestra ese sorteo en los resultados actuales.');
      }
      await refresh();
    } catch(error) {
      showError('No se pudo comprobar',error);
    } finally {
      button.disabled=false;
      button.textContent=previous;
    }
  });

  await refresh();
}

init();
