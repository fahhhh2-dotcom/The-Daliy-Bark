// Cast service worker: lets Cast install as an app and open even on a weak connection.
// Always tries the network first, so updates show up right away.
const CACHE='cast-v6';
const SHELL=['./','index.html','style.css','app.js','editor.js','moderation.js','firebase-config.js','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}return r})
    .catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))));
});
// open Cast when a notification is tapped
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'./';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){if('focus' in c){c.navigate?c.navigate(url).catch(()=>{}):0;return c.focus()}}
    return self.clients.openWindow(url);
  }));
});
