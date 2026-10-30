import { money } from '../utils/format.js?v=20261022-02';

const safe=(value='')=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const dateLabel=(value)=>{if(!value)return '—';const [y,m,d]=String(value).slice(0,10).split('-');return d&&m&&y?`${d}/${m}/${y}`:'—';};
const dayKey=(date)=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const monthName=(date)=>date.toLocaleDateString('es-ES',{month:'short'}).replace('.','');

export function renderWeekHeading(){
  const now=new Date();const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
  const sunday=new Date(monday);sunday.setDate(sunday.getDate()+6);
  const sameMonth=monday.getMonth()===sunday.getMonth();
  const label=sameMonth?`${monday.getDate()}–${sunday.getDate()} de ${sunday.toLocaleDateString('es-ES',{month:'long'})}`:`${monday.getDate()} ${monthName(monday)} – ${sunday.getDate()} ${monthName(sunday)}`;
  document.querySelectorAll('[data-week-range]').forEach(el=>el.textContent=label);
  return {start:dayKey(monday),end:dayKey(sunday),today:dayKey(now)};
}

function previewNumbers({fixedPlays=[],combinations=[],games=[]}){
  const holder=document.querySelector('#homeNumbers');if(!holder)return;
  const playIds=new Set(fixedPlays.filter(x=>x.activa!==false).map(x=>String(x.id)));
  const rows=combinations.filter(x=>playIds.has(String(x.jugada_fija_id))).sort((a,b)=>Number(a.numero_orden)-Number(b.numero_orden));
  const gameMap=new Map(games.map(x=>[x.codigo,x]));
  if(!rows.length){holder.innerHTML='<p class="public-note">Todavía no hay combinaciones publicadas.</p>';return;}
  holder.innerHTML=rows.slice(0,4).map((item,index)=>{
    const game=gameMap.get(item.juego_codigo);
    const balls=(item.numeros||[]).map(n=>`<span>${safe(n)}</span>`).join('');
    const stars=game?.formato==='5_estrellas' && (item.estrellas||[]).length ? '<em>★</em>'+(item.estrellas||[]).map(n=>`<span>${safe(n)}</span>`).join(''):'';
    return `<div class="home-number-row"><small>${safe(item.nombre||'Apuesta '+(index+1))}</small><div class="home-balls">${balls}${stars}</div></div>`;
  }).join('');
  const label=document.querySelector('#homeCombinationCount');if(label)label.textContent=`${rows.length} combinaciones habituales`;
}

function renderDrawHighlights({draws=[],bets=[],games=[]}){
  const week=renderWeekHeading();const map=new Map(games.map(game=>[game.codigo,game]));
  const byDraw=new Map();bets.forEach(bet=>{const key=String(bet.sorteo_id);if(!byDraw.has(key))byDraw.set(key,[]);byDraw.get(key).push(bet);});
  const current=draws.filter(draw=>draw.estado!=='comprobado'&&String(draw.fecha)>=week.start&&String(draw.fecha)<=week.end).sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)));
  const next=current.length?current:draws.filter(draw=>draw.estado!=='comprobado'&&String(draw.fecha)>=week.today).sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha))).slice(0,3);
  const upcoming=document.querySelector('#homeUpcoming');
  if(upcoming){
    upcoming.innerHTML=next.length?next.slice(0,4).map(draw=>{
      const amount=(byDraw.get(String(draw.id))||[]).reduce((sum,bet)=>sum+Number(bet.importe||0),0);
      return `<div class="latest-row"><span class="latest-icon">◷</span><div><strong>${safe(map.get(draw.juego_codigo)?.nombre||draw.juego_codigo)}</strong><small>${dateLabel(draw.fecha)} · ${safe(draw.nombre||'Sorteo')} </small></div><span class="latest-prize zero">${money(amount)}</span></div>`;
    }).join(''):'<p class="latest-empty">No hay sorteos próximos registrados. Consulta arriba la programación habitual.</p>';
    const label=document.querySelector('#homeUpcomingTitle');
    if(label)label.textContent=current.length?'Esta semana':'Próximos sorteos';
  }
  const history=draws.filter(draw=>draw.estado==='comprobado').sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha))||Number(b.id)-Number(a.id)).slice(0,3);
  const holder=document.querySelector('#homeLatest');if(holder){
    holder.innerHTML=history.length?history.map(draw=>{
      const prize=(byDraw.get(String(draw.id))||[]).reduce((sum,bet)=>sum+Number(bet.premio||0),0);
      return `<div class="latest-row"><span class="latest-icon">★</span><div><strong>${safe(map.get(draw.juego_codigo)?.nombre||draw.juego_codigo)}</strong><small>${dateLabel(draw.fecha)} · Resultado comprobado</small></div><span class="latest-prize ${prize?'':'zero'}">${money(prize)}</span></div>`;
    }).join(''):'<p class="latest-empty">Todavía no hay resultados comprobados.</p>';
  }
  const specials=draws.filter(draw=>draw.estado!=='comprobado'&&!draw.programacion_id&&(byDraw.get(String(draw.id))||[]).some(bet=>bet.tipo==='especial'));
  const specialHolder=document.querySelector('#homeSpecial');
  if(specialHolder){
    specialHolder.hidden=!specials.length;
    specialHolder.innerHTML=specials.length?'<strong>Jugada especial</strong> · '+specials.slice(0,3).map(draw=>`${safe(map.get(draw.juego_codigo)?.nombre||draw.juego_codigo)} (${dateLabel(draw.fecha)})`).join(' · '):'';
  }
}

export function renderPortada(snapshot){
  if(!snapshot)return;
  previewNumbers(snapshot);
  renderDrawHighlights(snapshot);
}
