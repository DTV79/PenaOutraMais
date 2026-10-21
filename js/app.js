'use strict';

const combinations=[[2,5,12,25,34,35],[14,15,16,23,42,48],[7,9,30,39,41,44],[7,16,21,25,45,46],[11,12,25,26,33,48],[5,8,19,22,36,45],[1,16,31,33,34,47],[15,17,22,26,39,41],[6,7,14,21,28,46],[1,7,21,22,23,44]];
const romans=['I','II','III','IV','V','VI','VII','VIII','IX','X'];
const members=[
{name:'ANA',status:'ok',note:'52 € pagados · Cuenta'},
{name:'CAPÓN',status:'ok',note:'52 € pagados · Bizum'},
{name:'CLARITA',status:'ok',note:'52 € pagados · Bizum'},
{name:'CRIS',status:'ok',note:'52 € pagados · Bizum'},
{name:'DIEGO',status:'ok',note:'52 € pagados · Cuenta'},
{name:'IÑAKI',status:'ok',note:'52 € pagados · +3 € para 2027'},
{name:'JAIME',status:'ok',note:'52 € pagados · Bizum'},
{name:'JORGE',status:'ok',note:'52 € pagados · Cuenta'},
{name:'MERCE',status:'ok',note:'52 € pagados · Cuenta'},
{name:'MERI',status:'ok',note:'52 € pagados · Bizum'},
{name:'MIRIAM',status:'ok',note:'52 € pagados · Bizum'},
{name:'OVI',status:'ok',note:'52 € pagados · Bizum'},
{name:'PABLETE',status:'ok',note:'52 € pagados · Cuenta'},
{name:'PATRI',status:'ok',note:'52 € pagados · Cuenta'},
{name:'PELÓN',status:'ok',note:'52 € pagados · Bizum'},
{name:'QUINTANA',status:'ok',note:'52 € pagados · +1 € para 2027'},
{name:'RAMI',status:'ok',note:'52 € pagados · Cuenta'},
{name:'ROSA',status:'ok',note:'52 € pagados · Efectivo'},
{name:'SERA',status:'pending',note:'0 € pagados · 52 € pendientes'},
{name:'YOLI',status:'ok',note:'52 € pagados · Cuenta'}
];
const monthlyAwards=[['Enero',21],['Febrero',21],['Marzo',0],['Abril',0],['Mayo',0],['Junio',0],['Julio',0],['Agosto',0],['Septiembre',0],['Octubre',0],['Noviembre',0],['Diciembre',0]];
const history=[
{year:2026,start:213.57,awards:42,spent:0,extra:0,end:255.57,note:'Temporada en curso'},
{year:2025,start:2147,awards:331.43,spent:2264.86,extra:0,end:213.57,note:'Salida importante del bote'},
{year:2024,start:1760,awards:387.23,spent:0,extra:0,end:2147.23,note:''},
{year:2023,start:1568,awards:252,spent:120,extra:60,end:1760,note:'Juego extraordinario: 120 € gastados / 60 € premiados'},
{year:2022,start:1291.48,awards:277.16,spent:0,extra:0,end:1568.64,note:''},
{year:2021,start:828,awards:463.48,spent:0,extra:0,end:1291.48,note:''},
{year:2020,start:508,awards:320,spent:0,extra:0,end:828,note:''},
{year:2019,start:233,awards:275,spent:0,extra:0,end:508,note:''},
{year:2018,start:10,awards:223,spent:0,extra:0,end:233,note:''},
{year:2017,start:0,awards:10,spent:0,extra:0,end:10,note:''},
{year:2016,start:286.78,awards:280.47,spent:0,extra:0,end:567.25,note:''},
{year:2015,start:46,awards:280.78,spent:40,extra:0,end:286.78,note:'40 € gastados en dos décimos de lotería'},
{year:2014,start:7,awards:39,spent:0,extra:0,end:46,note:''},
{year:2013,start:8,awards:329,spent:0,extra:0,end:337,note:''},
{year:2012,start:43,awards:8,spent:43,extra:0,end:8,note:'Salida/ajuste histórico inferido por diferencia de saldo'}
];
const rules=[
['Premios importantes','Si toca un premio igual o superior a 6.000 €, solo participan en el reparto quienes estén al día o tengan como máximo 2 € de deuda.'],
['Deudas prolongadas','Con una deuda superior a 8 €, el socio puede ser expulsado y no reincorporarse hasta después del siguiente reparto del premio acumulado.'],
['Nuevas incorporaciones','Quien entre nuevo debe ponerse al día desde el último reparto del premio acumulado hasta su fecha de alta.'],
['Baja voluntaria','Quien abandone solo tiene derecho a su parte del premio acumulado si está al corriente en el momento de la baja.'],
['Comidas o cenas','Si se utiliza el bote para una comida/cena, quien no asista recibe su parte proporcional o puede aplicarla a su cuota, siempre que no tenga deuda.'],
['Cambios de normas','Las normas pueden modificarse en casos especiales mediante votación secreta e individual y con acuerdo unánime.']
];
const money=n=>new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' €';

document.querySelector('#combinations').innerHTML=combinations.map((nums,i)=>`<article class="combination-card"><div class="combination-header"><strong>Combinación ${romans[i]}</strong><span>Fija</span></div><div class="balls">${nums.map(n=>`<span class="ball">${n}</span>`).join('')}</div></article>`).join('');

document.querySelector('#monthlyAwards').innerHTML=monthlyAwards.map(([month,val])=>`<div class="monthly-row"><span>${month.slice(0,3)}</span><div class="monthly-track"><i style="width:${val?100:0}%"></i></div><strong>${money(val)}</strong></div>`).join('');

function renderMembers(filter='all'){
 document.querySelector('#members').innerHTML=members.map(m=>`<div class="member ${filter!=='all'&&m.status!==filter?'hidden':''}"><span class="avatar">${m.name.slice(0,2)}</span><div class="member-main"><strong>${m.name}</strong><small>${m.note}</small></div><span class="status-badge ${m.status}">${m.status==='ok'?'Al corriente':'Pendiente'}</span></div>`).join('');
}
renderMembers();

document.querySelector('#historyList').innerHTML=history.map((h,i)=>`<details class="history-year" ${i===0?'open':''}><summary><span class="year-badge">${h.year}</span><span class="year-title"><strong>${h.year===2026?'Temporada actual':'Temporada '+h.year}</strong><small>${h.note||'Resumen anual'}</small></span><span class="year-total"><strong>${money(h.end)}</strong><small>saldo final</small></span></summary><div class="year-details"><div><span>Arrastre inicial</span><strong>${money(h.start)}</strong></div><div><span>Premios del año</span><strong class="green">+${money(h.awards)}</strong></div><div><span>Gastos / salidas</span><strong class="red">${h.spent?'-'+money(h.spent):money(0)}</strong></div><div><span>Premio extra</span><strong class="green">${h.extra?'+'+money(h.extra):money(0)}</strong></div>${h.note?`<div class="wide"><span>Observación</span><strong>${h.note}</strong></div>`:''}</div></details>`).join('');

document.querySelector('#rules').innerHTML=rules.map((r,i)=>`<article class="rule-card"><span class="rule-number">${i+1}</span><div><strong>${r[0]}</strong><p>${r[1]}</p></div></article>`).join('');

function navigate(target){
 document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id===target));
 const mainTargets=['inicio','numeros','premios','cuotas','mas'];
 document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.go===(mainTargets.includes(target)?target:(target==='historico'||target==='normas'?'mas':'inicio'))));
 history.replaceState(null,'','#'+target);
 window.scrollTo({top:0,behavior:'smooth'});
}
document.addEventListener('click',e=>{
 const go=e.target.closest('[data-go]');if(go)navigate(go.dataset.go);
 const f=e.target.closest('[data-filter]');if(f){document.querySelectorAll('.filter').forEach(x=>x.classList.toggle('active',x===f));renderMembers(f.dataset.filter);}
});
const initial=location.hash.replace('#','');if(document.getElementById(initial))navigate(initial);

// Datos generales desde Supabase. La maqueta mantiene valores de respaldo
// para que la web siga siendo legible si la API no está disponible.
async function loadSeasonFromSupabase(){
  const cfg=window.PENA_SUPABASE;
  if(!cfg?.url||!cfg?.publishableKey) return;
  try{
    const res=await fetch(`${cfg.url}/rest/v1/temporadas?select=anio,cuota_semanal,numero_semanas,cuota_anual,activa&activa=eq.true&limit=1`,{
      headers:{
        apikey:cfg.publishableKey,
        Authorization:`Bearer ${cfg.publishableKey}`
      }
    });
    if(!res.ok) throw new Error(`Supabase ${res.status}`);
    const [season]=await res.json();
    if(!season) return;
    document.querySelectorAll('[data-season-year]').forEach(el=>el.textContent=season.anio);
    document.querySelectorAll('[data-weekly-fee]').forEach(el=>el.textContent=`${Number(season.cuota_semanal).toLocaleString('es-ES')} €`);
    document.querySelectorAll('[data-annual-fee]').forEach(el=>el.textContent=`${Number(season.cuota_anual).toLocaleString('es-ES')} €`);
  }catch(err){
    console.warn('No se pudo cargar la temporada desde Supabase; se usan valores locales.',err);
  }
}
loadSeasonFromSupabase();

// Carga pública adicional desde Supabase. Los datos locales anteriores quedan
// como fallback para que la interfaz siga funcionando durante mantenimiento.
function fmtNumber(n){
  return Number(n).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2});
}

async function loadPublicDataFromSupabase(){
  try{
    const [season]=await supabaseSelect('temporadas?select=id,anio,cuota_semanal,numero_semanas,cuota_anual,activa&activa=eq.true&limit=1');
    if(!season) return;

    const [comboRows,historyRows,balanceRows,movementRows]=await Promise.all([
      supabaseSelect(`combinaciones?select=numero_orden,nombre,numeros&temporada_id=eq.${season.id}&activa=eq.true&order=numero_orden.asc`),
      supabaseSelect('resumen_anual?select=anio,arrastre_inicial,premios_ordinarios,gastos_salidas,premios_extra,saldo_final,observaciones,provisional&order=anio.desc'),
      supabaseSelect(`resumen_anual?select=arrastre_inicial,premios_ordinarios,gastos_salidas,premios_extra,saldo_final&anio=eq.${season.anio}&limit=1`),
      supabaseSelect(`movimientos_bote?select=mes,tipo,concepto,importe&anio=eq.${season.anio}&order=mes.asc.nullsfirst,id.asc`)
    ]);

    if(comboRows?.length){
      document.querySelector('#combinations').innerHTML=comboRows.map((row,i)=>`<article class="combination-card"><div class="combination-header"><strong>${row.nombre||`Combinación ${romans[i]||row.numero_orden}`}</strong><span>Fija</span></div><div class="balls">${row.numeros.map(n=>`<span class="ball">${n}</span>`).join('')}</div></article>`).join('');
    }

    if(historyRows?.length){
      document.querySelector('#historyList').innerHTML=historyRows.map((h,i)=>`<details class="history-year" ${i===0?'open':''}><summary><span class="year-badge">${h.anio}</span><span class="year-title"><strong>${h.anio===season.anio?'Temporada actual':'Temporada '+h.anio}</strong><small>${h.observaciones||'Resumen anual'}${h.provisional?' · pendiente de revisión':''}</small></span><span class="year-total"><strong>${money(h.saldo_final)}</strong><small>saldo final</small></span></summary><div class="year-details"><div><span>Arrastre inicial</span><strong>${money(h.arrastre_inicial)}</strong></div><div><span>Premios del año</span><strong class="green">+${money(h.premios_ordinarios)}</strong></div><div><span>Gastos / salidas</span><strong class="red">${Number(h.gastos_salidas)?'-'+money(h.gastos_salidas):money(0)}</strong></div><div><span>Premio extra</span><strong class="green">${Number(h.premios_extra)?'+'+money(h.premios_extra):money(0)}</strong></div>${h.observaciones?`<div class="wide"><span>Observación</span><strong>${h.observaciones}</strong></div>`:''}</div></details>`).join('');
    }

    const current=balanceRows?.[0];
    if(current){
      document.querySelectorAll('[data-current-balance]').forEach(el=>el.textContent=fmtNumber(current.saldo_final));
      document.querySelectorAll('[data-carryover]').forEach(el=>el.textContent=money(current.arrastre_inicial));
      document.querySelectorAll('[data-year-awards]').forEach(el=>el.textContent=money(current.premios_ordinarios));
      document.querySelectorAll('[data-year-awards-short]').forEach(el=>el.textContent=`${Number(current.premios_ordinarios).toLocaleString('es-ES')} €`);
    }

    if(movementRows?.length){
      const monthly=Array.from({length:12},()=>0);
      movementRows.filter(m=>m.tipo==='premio'&&m.mes).forEach(m=>monthly[m.mes-1]+=Number(m.importe));
      document.querySelector('#monthlyAwards').innerHTML=monthly.map((val,i)=>`<div class="monthly-row"><span>${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][i]}</span><div class="monthly-track"><i style="width:${val?100:0}%"></i></div><strong>${money(val)}</strong></div>`).join('');
    }
  }catch(err){
    console.warn('Se mantienen los datos locales de respaldo.',err);
  }
}
loadPublicDataFromSupabase();
