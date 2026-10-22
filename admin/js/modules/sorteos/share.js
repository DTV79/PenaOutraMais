function money(value) {
  return Number(value || 0).toLocaleString('es-ES',{
    useGrouping:'always',
    minimumFractionDigits:2,
    maximumFractionDigits:2
  }) + ' €';
}

function parseIso(value) {
  const [y,m,d]=String(value || '').split('-').map(Number);
  return new Date(Date.UTC(y,m-1,d));
}

function isoDate(date) {
  return date.toISOString().slice(0,10);
}

function addDays(date,days) {
  const next=new Date(date.getTime());
  next.setUTCDate(next.getUTCDate()+days);
  return next;
}

function previousWeekRange(drawDate) {
  const date=parseIso(drawDate);
  const mondayOffset=(date.getUTCDay()+6)%7;
  const currentMonday=addDays(date,-mondayOffset);
  const from=addDays(currentMonday,-7);
  const to=addDays(from,6);
  return { from:isoDate(from), to:isoDate(to) };
}

function weekdayDate(value) {
  const date=parseIso(value);
  const names=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const weekday=names[date.getUTCDay()];
  const [y,m,d]=String(value).split('-');
  return `${weekday}, ${d}/${m}/${y}`;
}

function weeklyPrize(snapshot,draw) {
  const { from,to }=previousWeekRange(draw.fecha);
  return (snapshot.prizeMovements || [])
    .filter((row)=>{
      const concept=String(row.concepto || '').toLocaleLowerCase('es');
      return (
        row.tipo==='premio' &&
        !row.anulado_at &&
        concept.includes('primitiva') &&
        row.fecha >= from &&
        row.fecha <= to
      );
    })
    .reduce((sum,row)=>sum+Number(row.importe || 0),0);
}

export function getShareData(snapshot,drawId) {
  const draw=snapshot?.draws?.find((row)=>String(row.id)===String(drawId));
  if (!draw) throw new Error('No se encontró el sorteo.');
  if (draw.juego_codigo!=='primitiva') {
    throw new Error('El resumen semanal está disponible para La Primitiva.');
  }

  const prize=weeklyPrize(snapshot,draw);
  const pot=Number(snapshot.potBalance || 0);

  return {
    draw,
    prize,
    pot,
    drawLabel:weekdayDate(draw.fecha),
    prizeText:money(prize),
    potText:money(pot)
  };
}

export function buildWhatsAppMessage(data) {
  return [
    '🍀 *Primitiva sellada · Peña Outra Máis*',
    '',
    `🏆 Premio semana anterior: *${data.prizeText}*`,
    `💰 Bote acumulado: *${data.potText}*`,
    '',
    '*¡Suerte! 😉*'
  ].join('\n');
}

export function shareWhatsApp(data) {
  const message=buildWhatsAppMessage(data);
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

function fitText(ctx,text,maxWidth,startSize,minSize=28) {
  let size=startSize;
  do {
    ctx.font=`800 ${size}px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size-=2;
  } while (size>minSize);
  return minSize;
}

async function loadImage(src) {
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=reject;
    image.src=src;
  });
}

export async function createShareCard(data) {
  const canvas=document.createElement('canvas');
  canvas.width=1080;
  canvas.height=1350;
  const ctx=canvas.getContext('2d');

  const navy='#071a2d';
  const navy2='#0d2d49';
  const blue='#08a6f2';
  const gold='#e5ba3a';
  const muted='#68798a';

  const gradient=ctx.createLinearGradient(0,0,1080,1350);
  gradient.addColorStop(0,'#eef5fa');
  gradient.addColorStop(1,'#ffffff');
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,1080,1350);

  // Cabecera de marca
  roundedRect(ctx,55,55,970,350,42);
  const head=ctx.createLinearGradient(55,55,1025,405);
  head.addColorStop(0,navy);
  head.addColorStop(1,navy2);
  ctx.fillStyle=head;
  ctx.fill();

  // Franjas azules
  ctx.save();
  ctx.translate(60,20);
  ctx.rotate(-0.18);
  ctx.fillStyle=blue;
  ctx.fillRect(-120,105,830,62);
  ctx.globalAlpha=.62;
  ctx.fillRect(-90,200,700,34);
  ctx.restore();

  // Banner/catedral si está disponible
  try {
    const img=await loadImage('../assets/pena-banner-approved.webp?v=20261022-19');
    ctx.save();
    roundedRect(ctx,55,55,970,350,42);
    ctx.clip();
    ctx.globalAlpha=.72;
    ctx.drawImage(img,55,55,970,350);
    ctx.restore();
  } catch (_) {}

  ctx.fillStyle='#fff';
  ctx.font='900 64px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('Peña Outra Máis',105,315);
  ctx.fillStyle=gold;
  ctx.font='800 25px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('PRIMITIVA SELLADA',108,355);

  // Tarjeta principal
  roundedRect(ctx,75,455,930,650,38);
  ctx.fillStyle='#fff';
  ctx.fill();
  ctx.strokeStyle='#dce5ec';
  ctx.lineWidth=3;
  ctx.stroke();

  ctx.fillStyle=muted;
  ctx.font='650 30px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('Sorteo',125,535);

  ctx.fillStyle=navy;
  fitText(ctx,data.drawLabel,820,53,38);
  ctx.fillText(data.drawLabel.charAt(0).toUpperCase()+data.drawLabel.slice(1),125,600);

  ctx.strokeStyle='#e6edf2';
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(125,650);
  ctx.lineTo(955,650);
  ctx.stroke();

  ctx.fillStyle=muted;
  ctx.font='700 28px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('PREMIO SEMANA ANTERIOR',125,735);

  ctx.fillStyle='#16834c';
  ctx.font='900 70px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText(data.prizeText,125,820);

  ctx.fillStyle=muted;
  ctx.font='700 28px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('BOTE ACUMULADO',125,915);

  ctx.fillStyle=navy;
  ctx.font='900 78px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText(data.potText,125,1010);

  // Pie
  roundedRect(ctx,75,1150,930,125,32);
  ctx.fillStyle=navy;
  ctx.fill();

  ctx.fillStyle='#fff';
  ctx.font='800 43px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('¡Suerte! 😉',125,1230);

  return new Promise((resolve,reject)=>{
    canvas.toBlob((blob)=>{
      if (blob) resolve(blob);
      else reject(new Error('No se pudo crear la tarjeta.'));
    },'image/png',.95);
  });
}

export async function shareCard(data) {
  const blob=await createShareCard(data);
  const file=new File(
    [blob],
    `pena-outra-mais-primitiva-${data.draw.fecha}.png`,
    { type:'image/png' }
  );

  if (navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))) {
    await navigator.share({
      files:[file],
      title:'Primitiva sellada · Peña Outra Máis',
      text:buildWhatsAppMessage(data)
    });
    return { shared:true };
  }

  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  return { shared:false,downloaded:true };
}
