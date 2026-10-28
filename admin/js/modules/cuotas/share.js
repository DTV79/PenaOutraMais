function money(value) {
  return Number(value || 0).toLocaleString('es-ES',{
    useGrouping:'always',
    minimumFractionDigits:2,
    maximumFractionDigits:2
  }) + ' €';
}

function cleanAlias(value='') {
  return String(value || '').trim();
}

function formatDate(value) {
  if (!value) return '';
  const [y,m,d]=String(value).split('-');
  return y && m && d ? `${d}/${m}/${y}` : String(value);
}

function isCurrentPayment(row,season) {
  return valid(row) &&
    row.tipo==='pago' &&
    Number(row.temporada_id)===Number(season.id) &&
    (!row.aplicar_anio || Number(row.aplicar_anio)===Number(season.anio));
}

function valid(row) {
  return !row.anulado_at;
}

function currentPayment(row,season) {
  if (!valid(row) || Number(row.temporada_id)!==Number(season.id)) return 0;
  if (row.tipo==='saldo_a_favor') return 0;
  if (row.aplicar_anio && Number(row.aplicar_anio)!==Number(season.anio)) return 0;
  return Number(row.importe || 0);
}

function carryForYear(row,year) {
  return valid(row) &&
    row.tipo==='saldo_a_favor' &&
    Number(row.aplicar_anio)===Number(year)
      ? Number(row.importe || 0)
      : 0;
}

export function buildQuotaShareData(snapshot) {
  const { season,members,allMovements=[] }=snapshot || {};
  if (!season) throw new Error('No hay temporada activa.');

  const quota=Number(season.cuota_anual || 0);
  const rows=members
    .map((member)=>{
      const memberMovements=allMovements.filter((row)=>row.socio_id===member.id);
      const carryIn=memberMovements.reduce(
        (sum,row)=>sum+carryForYear(row,season.anio),0
      );
      const paid=memberMovements.reduce(
        (sum,row)=>sum+currentPayment(row,season),0
      );
      const applied=carryIn+paid;
      const pending=Math.max(quota-applied,0);
      const carryNext=memberMovements.reduce(
        (sum,row)=>sum+carryForYear(row,Number(season.anio)+1),0
      );
      const paymentDate=memberMovements
        .filter((row)=>isCurrentPayment(row,season) && row.fecha)
        .map((row)=>row.fecha)
        .sort()
        .at(-1) || '';

      return {
        id:member.id,
        alias:cleanAlias(member.alias),
        quota,
        carryIn,
        paid,
        applied,
        pending,
        carryNext,
        paymentDate,
        paymentDateText:formatDate(paymentDate),
        current:pending<0.005
      };
    })
    .sort((a,b)=>a.alias.localeCompare(b.alias,'es',{sensitivity:'base'}));

  return {
    season,
    rows,
    generatedAt:new Date(),
    quota,
    totalPending:rows.reduce((sum,row)=>sum+row.pending,0),
    currentCount:rows.filter((row)=>row.current).length
  };
}

export function buildIndividualWhatsApp(data,row) {
  const nextYear=Number(data.season.anio)+1;
  const lines=[
    `*Estado de cuotas ${data.season.anio} · ${row.alias}*`,
    `• Cuota anual: *${money(row.quota)}*`
  ];

  if (row.paymentDateText) {
    lines.push(`• Fecha pago: ${row.paymentDateText}`);
  }

  if (row.carryIn>0.004) {
    lines.push(`• Acumulado anterior: *${money(row.carryIn)}*`);
  }

  lines.push(
    `• Pagado ${data.season.anio}: *${money(row.paid)}*`,
    `• Deuda ${data.season.anio}: *${money(row.pending)}*`
  );

  if (row.carryNext>0.004) {
    lines.push(`• Acum. año ${nextYear}: *${money(row.carryNext)}*`);
  }

  return lines.join('\n');
}

export function buildGeneralWhatsApp(data) {
  const nextYear=Number(data.season.anio)+1;
  const lines=[
    `*Estado de cuotas ${data.season.anio} · Peña Outra Máis*`,
    `Cuota anual: *${money(data.quota)}*`,
    ''
  ];

  data.rows.forEach((row,index)=>{
    lines.push(`• *${row.alias}*`);
    if (row.paymentDateText) lines.push(`    • Fecha pago: ${row.paymentDateText}`);
    if (row.carryIn>0.004) lines.push(`    • Acum. anterior: ${money(row.carryIn)}`);
    lines.push(
      `    • Pagado: *${money(row.paid)}*`,
      `    • Deuda: *${money(row.pending)}*`
    );
    if (row.carryNext>0.004) lines.push(`    • Acum. ${nextYear}: *${money(row.carryNext)}*`);
    if (index<data.rows.length-1) lines.push('');
  });

  return lines.join('\n');
}

export function shareWhatsApp(message) {
  window.location.href=`https://wa.me/?text=${encodeURIComponent(message)}`;
}

function roundedRect(ctx,x,y,w,h,r) {
  const radius=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+radius,y);
  ctx.arcTo(x+w,y,x+w,y+h,radius);
  ctx.arcTo(x+w,y+h,x,y+h,radius);
  ctx.arcTo(x,y+h,x,y,radius);
  ctx.arcTo(x,y,x+w,y,radius);
  ctx.closePath();
}

function fitText(ctx,text,maxWidth,startSize,minSize=24,weight=800) {
  let size=startSize;
  while (size>minSize) {
    ctx.font=`${weight} ${size}px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
    if (ctx.measureText(text).width<=maxWidth) break;
    size-=2;
  }
  return size;
}

async function loadImage(src) {
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=reject;
    image.src=src;
  });
}

async function drawBrand(ctx) {
  try {
    const img=await loadImage('assets/pena-banner-final-crisp.webp?v=20261023-10');
    ctx.save();
    roundedRect(ctx,55,55,970,250,34);
    ctx.clip();
    ctx.drawImage(img,55,55,970,250);
    ctx.restore();
  } catch (_) {}
}

function drawMetric(ctx,{x,y,w,label,value,valueColor='#071a2d'}) {
  roundedRect(ctx,x,y,w,150,26);
  ctx.fillStyle='#f6f9fb';
  ctx.fill();
  ctx.fillStyle='#68798a';
  ctx.font='700 23px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText(label,x+26,y+43);
  ctx.fillStyle=valueColor;
  ctx.font='900 42px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText(value,x+26,y+104);
}

export async function createIndividualCard(data,row) {
  const canvas=document.createElement('canvas');
  canvas.width=1080;
  canvas.height=1380;
  const ctx=canvas.getContext('2d');
  const navy='#071a2d', green='#16834c', amber='#a87712', muted='#68798a';

  const gradient=ctx.createLinearGradient(0,0,1080,1380);
  gradient.addColorStop(0,'#edf4f8');
  gradient.addColorStop(1,'#ffffff');
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,1080,1380);

  await drawBrand(ctx);

  roundedRect(ctx,75,360,930,875,38);
  ctx.fillStyle='#fff';
  ctx.fill();
  ctx.strokeStyle='#dce5ec';
  ctx.lineWidth=3;
  ctx.stroke();

  ctx.fillStyle=amber;
  ctx.font='800 27px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText(`ESTADO DE CUOTAS ${data.season.anio}`,125,440);

  ctx.fillStyle=navy;
  fitText(ctx,row.alias,800,66,42,900);
  ctx.fillText(row.alias,125,510);

  if (row.paymentDateText) {
    ctx.fillStyle=muted;
    ctx.font='italic 600 24px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    ctx.fillText(`Pago: ${row.paymentDateText}`,125,552);
  }

  roundedRect(ctx,125,575,260,58,29);
  ctx.fillStyle=row.current ? '#e7f5ec' : '#fff1da';
  ctx.fill();
  ctx.fillStyle=row.current ? green : '#8a5f0d';
  ctx.font='800 25px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText(row.current?'AL CORRIENTE':'PENDIENTE',154,613);

  drawMetric(ctx,{x:125,y:665,w:390,label:'CUOTA ANUAL',value:money(row.quota)});
  drawMetric(ctx,{x:565,y:665,w:390,label:'ACUM. ANTERIOR',value:money(row.carryIn),valueColor:row.carryIn>0?green:navy});
  drawMetric(ctx,{x:125,y:850,w:390,label:`PAGADO ${data.season.anio}`,value:money(row.paid),valueColor:green});
  drawMetric(ctx,{x:565,y:850,w:390,label:`DEUDA ${data.season.anio}`,value:money(row.pending),valueColor:row.pending>0?amber:green});

  roundedRect(ctx,125,1050,830,115,28);
  ctx.fillStyle=navy;
  ctx.fill();
  ctx.fillStyle='#fff';
  ctx.font='700 25px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText(`ACUMULADO PARA ${Number(data.season.anio)+1}`,155,1093);
  ctx.font='900 42px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText(money(row.carryNext),155,1145);

  ctx.fillStyle=muted;
  ctx.font='600 21px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('Peña Outra Máis · Estado individual de cuotas',125,1295);

  return new Promise((resolve,reject)=>{
    canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error('No se pudo crear la tarjeta.')),'image/png',.95);
  });
}

export async function createGeneralCard(data) {
  const rowH=96;
  const startY=565;
  const height=Math.max(1550,startY+(data.rows.length*rowH)+190);
  const canvas=document.createElement('canvas');
  canvas.width=1080;
  canvas.height=height;
  const ctx=canvas.getContext('2d');
  const navy='#071a2d', green='#16834c', amber='#a87712', muted='#68798a';

  const gradient=ctx.createLinearGradient(0,0,1080,height);
  gradient.addColorStop(0,'#edf4f8');
  gradient.addColorStop(1,'#ffffff');
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,1080,height);

  await drawBrand(ctx);

  ctx.fillStyle=amber;
  ctx.font='800 27px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText(`ESTADO DE CUOTAS ${data.season.anio}`,75,390);

  ctx.fillStyle=navy;
  ctx.font='900 54px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('Resumen de socios',75,460);

  ctx.fillStyle=muted;
  ctx.font='650 24px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText(`Cuota anual: ${money(data.quota)} · Al corriente: ${data.currentCount}/${data.rows.length}`,75,510);

  roundedRect(ctx,55,535,970,data.rows.length*rowH+60,34);
  ctx.fillStyle='#fff';
  ctx.fill();
  ctx.strokeStyle='#dce5ec';
  ctx.lineWidth=3;
  ctx.stroke();

  ctx.fillStyle=muted;
  ctx.font='700 19px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('SOCIO',85,575);
  ctx.fillText('ACUM. ANT.',385,575);
  ctx.fillText('PAGADO',555,575);
  ctx.fillText('DEUDA',720,575);
  ctx.fillText(`ACUM. ${Number(data.season.anio)+1}`,855,575);

  data.rows.forEach((row,index)=>{
    const y=startY+(index*rowH)+48;
    if(index>0){
      ctx.strokeStyle='#e9eef2';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(85,y-50);
      ctx.lineTo(995,y-50);
      ctx.stroke();
    }

    ctx.fillStyle=navy;
    fitText(ctx,row.alias,275,26,20,800);
    ctx.fillText(row.alias,85,y-7);

    if (row.paymentDateText) {
      ctx.fillStyle=muted;
      ctx.font='italic 600 17px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      ctx.fillText(`Pago: ${row.paymentDateText}`,85,y+20);
    }

    ctx.font='800 22px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    ctx.fillStyle=row.carryIn>0.004?navy:muted;
    ctx.fillText(money(row.carryIn),385,y+5);

    ctx.fillStyle=green;
    ctx.fillText(money(row.paid),555,y+5);

    ctx.fillStyle=row.pending>0.004?amber:green;
    ctx.fillText(money(row.pending),720,y+5);

    ctx.fillStyle=row.carryNext>0.004?navy:muted;
    ctx.fillText(money(row.carryNext),855,y+5);
  });

  ctx.fillStyle=muted;
  ctx.font='600 21px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('Peña Outra Máis · Resumen general de cuotas',75,height-70);

  return new Promise((resolve,reject)=>{
    canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error('No se pudo crear la tarjeta.')),'image/png',.95);
  });
}

async function shareBlob(blob,filename) {
  const file=new File([blob],filename,{type:'image/png'});
  if (navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))) {
    await navigator.share({files:[file]});
    return {shared:true};
  }

  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  return {shared:false,downloaded:true};
}

export function shareIndividualCard(data,row) {
  return createIndividualCard(data,row).then((blob)=>
    shareBlob(blob,`pena-outra-mais-cuotas-${data.season.anio}-${row.alias.toLowerCase().replace(/[^a-z0-9]+/gi,'-')}.png`)
  );
}

export function shareGeneralCard(data) {
  return createGeneralCard(data).then((blob)=>
    shareBlob(blob,`pena-outra-mais-cuotas-${data.season.anio}-general.png`)
  );
}
