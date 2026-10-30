import { SUPABASE_CONFIG } from '../config/supabase-config.js';
const STATUTES_PATH='documentos-publicos/estatutos/estatutos-vigentes.pdf';

export async function renderRules(){
  const card=document.querySelector('#statutesPdfCard');
  const link=document.querySelector('#statutesPdfLink');
  const pending=document.querySelector('#statutesPending');
  if(!card||!link)return;
  const url=`${SUPABASE_CONFIG.url}/storage/v1/object/public/${STATUTES_PATH}`;
  try{
    const response=await fetch(url+'?check='+Date.now(),{method:'HEAD',cache:'no-store'});
    if(!response.ok)return;
    link.href=url;
    card.hidden=false;
    if(pending)pending.hidden=true;
  }catch(error){
    console.info('El PDF de estatutos todavía no está accesible.');
  }
}
