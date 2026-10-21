import { bootstrapAdmin } from '../../app/bootstrap.js';
import { openModal } from '../../ui/modal.js';
import {
  getDrawsSnapshot,
  createFixedDraw,
  createSpecialBet,
  saveProgram,
  checkDraw,
  updateDrawRefund
} from './service.js?v=20261021-10';
import { openFixedDrawForm, openSpecialBetForm, openRefundForm } from './form.js?v=20261021-10';
import { renderDraws } from './list.js?v=20261021-10';
import { renderSchedule } from './schedule.js?v=20261021-10';

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
    const refundButton=event.target.closest('[data-draw-refund]');
    if (refundButton) {
      const draw=snapshot?.draws.find((row)=>String(row.id)===String(refundButton.dataset.drawRefund));
      if (!draw) return;

      openRefundForm({
        draw,
        bets:snapshot.bets,
        onSave:async(reintegro)=>{
          await updateDrawRefund(draw.id,snapshot.bets,reintegro);
          await refresh();
        }
      });
      return;
    }

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
