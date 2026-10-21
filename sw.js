const CACHE='pena-outra-mais-v2';
const ASSETS=[
  './',
  './index.html',
  './css/styles.css',
  './js/supabase.js',
  './js/app.js',
  './js/pwa.js',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  event.respondWith(
    fetch(event.request).catch(()=>caches.match(event.request).then(response=>response||caches.match('./index.html')))
  );
});
