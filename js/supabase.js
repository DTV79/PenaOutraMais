'use strict';

window.PENA_SUPABASE = Object.freeze({
  url: 'https://djrmbdbtfsgzwwcsatll.supabase.co',
  publishableKey: 'sb_publishable_aZW9m8Xf4N-B6sC3ubATBQ_A7mUOiM0'
});

async function supabaseSelect(path){
  const cfg=window.PENA_SUPABASE;
  if(!cfg?.url||!cfg?.publishableKey) throw new Error('Supabase no configurado');
  const res=await fetch(`${cfg.url}/rest/v1/${path}`,{
    headers:{apikey:cfg.publishableKey,Authorization:`Bearer ${cfg.publishableKey}`}
  });
  if(!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}
