const CACHE='takecontrol-v57';
const ASSETS=['./','index.html','money-insights.js?v=57','money-levels.js?v=57','encrypted-backup.js?v=57','local-vault.js?v=57','backup-save.js?v=57','PRIVACY.md','icons/money-rookie-cartoon.webp','icons/money-builder-cartoon.webp','icons/money-strategist-cartoon.webp','icons/money-master-cartoon.webp','icons/level-complete.webp','icons/level-builder.webp','icons/level-momentum.webp','icons/level-master.webp','icons/level-celebration.webp','icons/level-ribbon.webp','icons/brand-doordash.svg','icons/brand-ubereats.svg','icons/brand-postmates.svg','icons/brand-icloud.svg','icons/brand-netflix.svg','icons/brand-visa.svg','icons/brand-mastercard.svg','icons/brand-americanexpress.svg','ui.css?v=57','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'].concat(['zero','pay','ef','needs','subs','time','paycheck','debt','give','balance','grow','assets','credit101','creditcost','creditscore'].map(k=>'images/'+k+'.jpg'));
const ROOT=new URL('./',self.location.href);
const ALLOWED=new Set(ASSETS.map(p=>new URL(p,ROOT).href));
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('takecontrol-v')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||!ALLOWED.has(e.request.url))return;
 const page=e.request.mode==='navigate';
 e.respondWith((async()=>{
  const c=await caches.open(CACHE),cached=await c.match(e.request);
  if(!page&&cached)return cached;
  try{
   const res=await fetch(e.request);
   if(res.ok&&res.type==='basic'&&new URL(res.url).origin===ROOT.origin){await c.put(e.request,res.clone());return res;}
   return cached||res;
  }catch(err){if(cached)return cached;throw err;}
 })());
});
