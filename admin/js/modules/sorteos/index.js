import { bootstrapAdmin } from '../../app/bootstrap.js';
import { openModal, confirmModal } from '../../ui/modal.js';
import {
  getDrawsSnapshot,
  createSpecialBet,
  createProgram,
  updateProgram,
  setProgramActive,
  refreshScheduledDraws,
  checkDraw,
  updateDrawRefund,
  deleteDraw
} from './service.js?v=20261022-04';
import { openSpecialBetForm, openRefundForm } from './form.js?v=20261022-05';
import { openProgramForm } from './program-form.js?v=20261022-04';
import { renderPrograms } from './program-list.js?v=20261022-04';
import { renderDraws } from './list.js?v=20261022-05';

let snapshot=null;
const panels=document.querySelector('.draw-tab-panels');
const programsBox=document.querySelector('#programsAdmin');

function activateTab(name) {
  document.querySelectorAll('[data-draw-tab]').forEach((button)=>{
    button.classList.toggle('active',button.dataset.drawTab===name);
  });

  document.querySelectorAll('[data-draw-panel]').forEach((panel)=>{
    panel.classList.toggle('active',panel.dataset.drawPanel===name);
  });
}

function setupTabs() {
  document.querySelectorAll('[data-draw-tab]').forEach((button)=>{
    button.addEventListener('click',()=>activateTab(button.dataset.drawTab));
  });
}

async function refresh() {
  try {
    snapshot=await getDrawsSnapshot();
    renderPrograms(snapshot);
    renderDraws(snapshot);
  } catch(error) {
    const target=document.querySelector('.draw-tab-panel.active .admin-loading')
      || programsBox
      || document.querySelector('#drawsActive');
    if (target) target.innerHTML=`<div class="admin-error visible">${error.message}</div>`;
  }
}

function showError(title,error) {
  openModal({
    title,
    content:`<div class="admin-error visible">${error?.message || error}</div>`,
    actions:'<button class="admin-action" type="button" data-modal-close>Cerrar</button>'
  });
}

async function saveProgramming(program,payload) {
  if (program) {
    await updateProgram(program.id,payload,snapshot.fixedCombinations);
  } else {
    await createProgram(payload,snapshot.fixedCombinations);
  }

  await refreshScheduledDraws();
  await refresh();
}

function openProgramming(program=null) {
  if (!snapshot?.season) return;

  openProgramForm({
    season:snapshot.season,
    games:snapshot.games,
    fixedPlays:snapshot.fixedPlays,
    fixedCombinations:snapshot.fixedCombinations,
    program,
    onSave:async(payload)=>saveProgramming(program,payload)
  });
}

async function init() {
  if (!await bootstrapAdmin()) return;

  setupTabs();

  document.querySelector('#newProgramButton')?.addEventListener('click',()=>{
    openProgramming(null);
  });

  document.querySelector('#newSpecialBetButton')?.addEventListener('click',()=>{
    if (!snapshot?.season) return;

    openSpecialBetForm({
      season:snapshot.season,
      games:snapshot.games,
      onSave:async(payload)=>{
        await createSpecialBet(payload);
        await refresh();
        activateTab('enjuego');
      }
    });
  });

  programsBox?.addEventListener('click',async(event)=>{
    const editButton=event.target.closest('[data-program-edit]');
    if (editButton) {
      const program=snapshot?.programs.find(
        (row)=>String(row.id)===String(editButton.dataset.programEdit)
      );
      if (program) openProgramming(program);
      return;
    }

    const toggleButton=event.target.closest('[data-program-toggle]');
    if (toggleButton) {
      const program=snapshot?.programs.find(
        (row)=>String(row.id)===String(toggleButton.dataset.programToggle)
      );
      if (!program) return;

      const nextActive=toggleButton.dataset.nextActive==='true';

      if (nextActive && program.usar_combinaciones_fijas) {
        const play=snapshot.fixedPlays.find(
          (row)=>String(row.id)===String(program.jugada_fija_id)
        );
        if (!play?.activa) {
          showError(
            'No se puede activar',
            'La jugada fija asociada está inactiva. Reactívala primero desde Números.'
          );
          return;
        }
      }

      const confirmed=await confirmModal({
        title:nextActive?'Activar programación':'Desactivar programación',
        message:nextActive
          ? `¿Quieres activar “${program.nombre}”? Se crearán automáticamente los próximos sorteos que correspondan.`
          : `¿Quieres desactivar “${program.nombre}”? Los sorteos automáticos futuros de esta programación se retirarán.`,
        confirmText:nextActive?'Activar':'Desactivar',
        danger:!nextActive
      });

      if (!confirmed) return;

      try {
        await setProgramActive(program.id,nextActive);
        await refreshScheduledDraws();
        await refresh();
      } catch(error) {
        showError('No se pudo actualizar',error);
      }
      return;
    }
  });

  panels?.addEventListener('click',async(event)=>{
    const deleteButton=event.target.closest('[data-draw-delete]');
    if (deleteButton) {
      const draw=snapshot?.draws.find(
        (row)=>String(row.id)===String(deleteButton.dataset.drawDelete)
      );
      if (!draw) return;

      const drawBets=snapshot.bets.filter(
        (bet)=>Number(bet.sorteo_id)===Number(draw.id)
      );
      const total=drawBets.reduce((sum,bet)=>sum+Number(bet.importe || 0),0);

      const confirmed=await confirmModal({
        title:'Eliminar sorteo',
        message:`¿Quieres eliminar el sorteo del ${draw.fecha.split('-').reverse().join('/')}? Se borrarán también sus apuestas y se devolverá el gasto al fondo del que salió. Total jugado: ${total.toLocaleString('es-ES',{useGrouping:'always',minimumFractionDigits:2,maximumFractionDigits:2})} €.`,
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
      const draw=snapshot?.draws.find(
        (row)=>String(row.id)===String(refundButton.dataset.drawRefund)
      );
      if (!draw) return;

      openRefundForm({
        draw,
        game:snapshot.games.find((row)=>row.codigo===draw.juego_codigo),
        bets:snapshot.bets,
        combinations:snapshot.fixedCombinations,
        onSave:async(reintegros)=>{
          await updateDrawRefund(draw.id,snapshot.bets,reintegros);
          await refresh();
        }
      });
      return;
    }

    const checkButton=event.target.closest('[data-draw-check]');
    if (!checkButton) return;

    checkButton.disabled=true;
    const previous=checkButton.textContent;
    checkButton.textContent='Comprobando…';

    try {
      const result=await checkDraw(checkButton.dataset.drawCheck);
      if (result?.resultados?.[0]?.status==='sin_resultado') {
        showError(
          'Resultado aún no disponible',
          'SELAE todavía no muestra ese sorteo en los resultados actuales.'
        );
      }
      await refresh();
    } catch(error) {
      showError('No se pudo comprobar',error);
    } finally {
      checkButton.disabled=false;
      checkButton.textContent=previous;
    }
  });

  await refresh();
}

init();
