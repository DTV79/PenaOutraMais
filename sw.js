const CACHE='pena-outra-mais-v23';
const ASSETS=[
 './','./index.html',
 './css/styles.css','./css/base.css','./css/layout.css','./css/components.css','./css/pages.css','./css/theme.css','./css/public-redesign.css',
 './js/app/main.js','./js/config/supabase-config.js','./js/data/fallback.js',
 './js/modules/cuotas.js','./js/modules/historico.js','./js/modules/normas.js','./js/modules/numeros.js','./js/modules/premios.js','./js/modules/sorteos.js','./js/modules/portada.js','./js/modules/temporada.js',
 './js/services/public-data.js','./js/services/supabase.js','./js/ui/navigation.js','./js/utils/format.js','./js/pwa.js','./manifest.webmanifest','./icon-public.png'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 event.respondWith(fetch(event.request).catch(()=>caches.match(event.request,{ignoreSearch:true}).then(response=>response||caches.match('./index.html'))));
});
