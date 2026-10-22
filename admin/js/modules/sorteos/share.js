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

function formatDate(value) {
  const [y,m,d]=String(value).split('-');
  return `${d}/${m}/${y}`;
}

function currentWeekDrawDates(drawDate) {
  const date=parseIso(drawDate);
  const mondayOffset=(date.getUTCDay()+6)%7;
  const monday=addDays(date,-mondayOffset);
  return {
    thursday:isoDate(addDays(monday,3)),
    saturday:isoDate(addDays(monday,5))
  };
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
  const exactPot=Number(snapshot.potBalance || 0);
  const previousWholePot=Math.floor(Math.max(0,exactPot-prize));
  const sharedPot=Math.floor(previousWholePot+prize);
  const dates=currentWeekDrawDates(draw.fecha);

  return {
    draw,
    prize,
    exactPot,
    sharedPot,
    thursday:dates.thursday,
    saturday:dates.saturday,
    datesText:`Jueves ${formatDate(dates.thursday)} · Sábado ${formatDate(dates.saturday)}`,
    prizeText:money(prize),
    potText:money(sharedPot)
  };
}

export function buildWhatsAppMessage(data) {
  return [
    '*Primitiva sellada*',
    `• Premio: *${data.prizeText}*`,
    `• Bote acumulado: *${data.potText}*`,
    '',
    'Suerte 😉'
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
    const img=await loadImage('assets/pena-banner-approved.webp?v=20261022-19');
    ctx.save();
    roundedRect(ctx,55,55,970,350,42);
    ctx.clip();
    ctx.globalAlpha=.72;
    ctx.drawImage(img,55,55,970,350);
    ctx.restore();
  } catch (_) {}

  // Tarjeta principal
  roundedRect(ctx,75,455,930,650,38);
  ctx.fillStyle='#fff';
  ctx.fill();
  ctx.strokeStyle='#dce5ec';
  ctx.lineWidth=3;
  ctx.stroke();

  ctx.fillStyle=navy;
  ctx.font='900 48px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('PRIMITIVA SELLADA',125,535);

  ctx.fillStyle=muted;
  ctx.font='650 27px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('SORTEOS',125,590);

  ctx.fillStyle=navy;
  fitText(ctx,data.datesText,820,43,30);
  ctx.fillText(data.datesText,125,645);

  ctx.strokeStyle='#e6edf2';
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(125,690);
  ctx.lineTo(955,690);
  ctx.stroke();

  ctx.fillStyle=muted;
  ctx.font='700 28px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('PREMIO SEMANA ANTERIOR',125,775);

  ctx.fillStyle='#16834c';
  ctx.font='900 70px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText(data.prizeText,125,860);

  ctx.fillStyle=muted;
  ctx.font='700 28px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('BOTE ACUMULADO',125,950);

  ctx.fillStyle=navy;
  ctx.font='900 78px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText(data.potText,125,1040);

  // Pie
  roundedRect(ctx,75,1150,930,125,32);
  ctx.fillStyle=navy;
  ctx.fill();

  ctx.fillStyle='#fff';
  ctx.font='800 43px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  ctx.fillText('Suerte 😉',125,1230);

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
      title:'Primitiva sellada'
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
