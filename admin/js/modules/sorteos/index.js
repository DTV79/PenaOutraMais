import { bootstrapAdmin } from '../../app/bootstrap.js';
import { openModal, confirmModal } from '../../ui/modal.js';
import {
  getDrawsSnapshot,
  createSpecialBet,
  saveProgram,
  checkDraw,
  updateDrawRefund,
  deleteDraw
} from './service.js?v=20261021-19';
import { openSpecialBetForm, openRefundForm } from './form.js?v=20261021-19';
import { renderDraws } from './list.js?v=20261021-19';
import { renderSchedule } from './schedule.js?v=20261021-19';

let snapshot=null;
const drawsArea=document.querySelector('#drawsArea');

async function refresh() {
  try {
    snapshot=await getDrawsSnapshot();
    renderDraws(snapshot);

    const program=snapshot.programs.find((row)=>row.juego_codigo==='primitiva') || null;
    renderSchedule(program,snapshot.fixedCombinationCount,async(payload)=>{
      await saveProgram(program.id,payload);
      snapshot=await getDrawsSnapshot();
      const updated=snapshot.programs.find((row)=>row.juego_codigo==='primitiva') || null;
      renderSchedule(updated,snapshot.fixedCombinationCount,async(next)=>saveProgram(updated.id,next));
    });
  } catch(error) {
    document.querySelector('#drawsActive').innerHTML=
      `<div class="admin-error visible">${error.message}</div>`;
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

  drawsArea.addEventListener('click',async(event)=>{
    const deleteButton=event.target.closest('[data-draw-delete]');
    if (deleteButton) {
      const draw=snapshot?.draws.find((row)=>String(row.id)===String(deleteButton.dataset.drawDelete));
      if (!draw) return;

      const drawBets=snapshot.bets.filter((bet)=>Number(bet.sorteo_id)===Number(draw.id));
      const total=drawBets.reduce((sum,bet)=>sum+Number(bet.importe || 0),0);
      const confirmed=await confirmModal({
        title:'Eliminar sorteo',
        message:`¿Quieres eliminar el sorteo del ${draw.fecha.split('-').reverse().join('/')}? Se borrarán también sus apuestas y se devolverá el gasto al fondo del que salió. Total jugado: ${total.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})} €.`,
        confirmText:'Eliminar',
        danger:true
      });

      if (!confirmed) return;

      try {
        await deleteDraw(draw.id);
        await refresh();
      } catch(error) {
        showError('No se pudo eliminar',error);
      }
      return;
    }

    const refundButton=event.target.closest('[data-draw-refund]');
    if (refundButton) {
      const draw=snapshot?.draws.find((row)=>String(row.id)===String(refundButton.dataset.drawRefund));
      if (!draw) return;

      openRefundForm({
        draw,
        bets:snapshot.bets,
        onSave:async(reintegros)=>{
          await updateDrawRefund(draw.id,snapshot.bets,reintegros);
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
