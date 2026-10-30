import { money } from '../utils/format.js?v=20261022-02';

const esc=(value='')=>String(value??'')
  .replaceAll('&','&amp;')
  .replaceAll('<','&lt;')
  .replaceAll('>','&gt;')
  .replaceAll('"','&quot;')
  .replaceAll("'",'&#039;');

const isoDay=(date)=>[
  date.getFullYear(),
  String(date.getMonth()+1).padStart(2,'0'),
  String(date.getDate()).padStart(2,'0')
].join('-');

function weekRange(){
  const today=new Date();
  const monday=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
  const sunday=new Date(monday.getFullYear(),monday.getMonth(),monday.getDate()+6);
  return { monday, sunday, today:isoDay(today), from:isoDay(monday), to:isoDay(sunday) };
}

function shortDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return 'Fecha sin indicar';
  const [y,m,d]=value.split('-').map(Number);
  const text=new Date(y,m-1,d).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'short'});
  return text.charAt(0).toLocaleUpperCase('es-ES')+text.slice(1);
}

export function renderWeekHeading(){
  const {monday,sunday,from,to}=weekRange();
  const start=monday.toLocaleDateString('es-ES',{day:'numeric',month:'short'});
  const end=sunday.toLocaleDateString('es-ES',{day:'numeric',month:'short'});
  document.querySelectorAll('[data-week-range]').forEach(el=>{el.textContent=`${start} – ${end}`;});
  return {start:from,end:to};
}

function isPrimitiva(draw,program){
  return (draw?.juego_codigo||program?.juego_codigo)==='primitiva';
}

function hasReintegro(bet){
  const value=bet?.datos?.reintegro;
  // Reintegro 0 también es válido. El campo debe existir en TODAS las apuestas.
  return value!==null && value!==undefined && String(value).trim()!=='' &&
    Number.isInteger(Number(value)) && Number(value)>=0 && Number(value)<=9;
}

function drawState(draw,drawBets,program,today){
  if(draw?.estado==='comprobado'){
    return {label:'Comprobado',status:'checked'};
  }
  if(!draw||drawBets.length===0){
    return {label:'Pendiente de sellar',status:'unsealed'};
  }
  if(isPrimitiva(draw,program)){
    // No basta que exista el sorteo automático ni que haya apuestas.
    // Solo se marca como sellado cuando TODAS llevan su reintegro grabado.
    if(!drawBets.every(hasReintegro)){
      return {label:'Pendiente de sellar',status:'unsealed'};
    }
    return draw.fecha<today
      ? {label:'Sellada · por comprobar',status:'sealed'}
      : {label:'Sellada · en juego',status:'sealed'};
  }
  // No afirmar que otras loterías están selladas solo porque exista la programación.
  return {label:'Apuesta registrada',status:'registered'};
}

function programDay(date,number){
  const d=new Date(date.getFullYear(),date.getMonth(),date.getDate()+Number(number)-1);
  return isoDay(d);
}

function programSummary(programs,games){
  const holder=document.querySelector('#homeActivePrograms');
  if(!holder)return;
  const map=new Map(games.map(game=>[game.codigo,game.nombre]));
  if(!programs.length){
    holder.textContent='No hay jugadas habituales activadas.';
    return;
  }
  const days={1:'lunes',2:'martes',3:'miércoles',4:'jueves',5:'viernes',6:'sábado',7:'domingo'};
  holder.textContent=programs.map(program=>{
    const title=map.get(program.juego_codigo)||program.nombre||program.juego_codigo;
    const when=(program.dias_semana||[]).map(d=>days[Number(d)]).filter(Boolean).join(' y ');
    return `${title}${when?' · '+when:''}`;
  }).join(' · ');
}

function renderWeekDraws({programs=[],draws=[],bets=[],games=[]}){
  const holder=document.querySelector('#homeWeeklyDraws');
  if(!holder)return;
  const {monday,from,to,today}=weekRange();
  const gameNames=new Map(games.map(g=>[g.codigo,g.nombre]));
  const byDraw=new Map();
  for(const bet of bets){
    const id=String(bet.sorteo_id);
    if(!byDraw.has(id))byDraw.set(id,[]);
    byDraw.get(id).push(bet);
  }
  const weekDraws=draws.filter(d=>String(d.fecha)>=from && String(d.fecha)<=to);
  const displayed=new Set();
  const entries=[];

  // Mostrar los días habituales activados aunque todavía no exista un sorteo.
  for(const program of programs){
    for(const number of program.dias_semana||[]){
      if(!Number.isInteger(Number(number))||Number(number)<1||Number(number)>7)continue;
      const date=programDay(monday,number);
      const matches=weekDraws.filter(d=>String(d.programacion_id)===String(program.id)&&d.fecha===date);
      if(matches.length){
        for(const draw of matches){
          if(displayed.has(String(draw.id)))continue;
          displayed.add(String(draw.id));
          entries.push({date,draw,program});
        }
      }else{
        entries.push({date,draw:null,program});
      }
    }
  }

  // Jugadas especiales o sorteos sueltos de esta semana: nunca incluir históricos.
  for(const draw of weekDraws){
    if(displayed.has(String(draw.id)))continue;
    const drawBets=byDraw.get(String(draw.id))||[];
    if(!drawBets.length)continue;
    entries.push({date:draw.fecha,draw,program:programs.find(p=>String(p.id)===String(draw.programacion_id))||null});
  }

  entries.sort((a,b)=>a.date.localeCompare(b.date)||
    String(a.draw?.id||a.program?.id||'').localeCompare(String(b.draw?.id||b.program?.id||'')));
  holder.innerHTML=entries.length?entries.map(({date,draw,program})=>{
    const drawBets=draw?byDraw.get(String(draw.id))||[]:[];
    const {label,status}=drawState(draw,drawBets,program,today);
    const name=gameNames.get(draw?.juego_codigo||program?.juego_codigo)||
      program?.nombre||draw?.juego_codigo||'Sorteo';
    const prize=drawBets.reduce((sum,bet)=>sum+Number(bet.premio||0),0);
    const amount=drawBets.reduce((sum,bet)=>sum+Number(bet.importe||0),0);
    let detail='';
    if(status==='checked'){
      detail=prize>0?`Premio: <strong class="home-week-prize">${money(prize)}</strong>`:
        '<span class="home-no-prize">Sin premio</span>';
    }else if(status==='sealed'){
      detail=`${drawBets.length} apuesta${drawBets.length===1?'':'s'} sellada${drawBets.length===1?'':'s'} · ${money(amount)}`;
    }else if(status==='unsealed'){
      detail=drawBets.length?'Pendiente de introducir el reintegro':'Todavía no hay apuestas selladas';
    }else{
      detail=`${drawBets.length} apuesta${drawBets.length===1?'':'s'} registrada${drawBets.length===1?'':'s'} · ${money(amount)}`;
    }

    return `<article class="home-week-row">
      <div class="home-week-row-main">
        <strong>${esc(name)}</strong>
        <small>${esc(shortDate(date))}</small>
        <span class="home-week-detail">${detail}</span>
      </div>
      <span class="home-draw-status ${status}">${esc(label)}</span>
    </article>`;
  }).join(''):'<p class="home-week-empty">No hay sorteos programados para esta semana.</p>';
}

export function renderPortada(snapshot){
  if(!snapshot)return;
  const previousYear=Number(snapshot.season?.anio)-1;
  document.querySelectorAll('[data-prev-season-year]').forEach(el=>{
    el.textContent=Number.isInteger(previousYear)?String(previousYear):'anterior';
  });
  renderWeekHeading();
  programSummary(snapshot.programs||[],snapshot.games||[]);
  renderWeekDraws(snapshot);
}
