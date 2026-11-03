/* Optional on-device vault. Unlock keys exist only in this module's memory. */
(function(root){
 'use strict';
 const SLOT='moneyAhead.vault.v1',PLAIN='moneyAhead.v2',ITERATIONS=600000,AAD=new TextEncoder().encode('take-control-local-vault-v1');
 const enc=new TextEncoder(),dec=new TextDecoder('utf-8',{fatal:true});
 let key=null,salt=null,queue=Promise.resolve(),pending=0;
 const b64=b=>{let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s);};
 const un64=s=>{if(typeof s!=='string'||s.length>7000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(s))throw Error('Invalid vault encoding.');return Uint8Array.from(atob(s),c=>c.charCodeAt(0));};
 function envelope(raw){
  if(typeof raw!=='string'||raw.length>7000000)throw Error('Invalid vault.');
  const x=JSON.parse(raw);
  if(x.format!=='take-control-local-vault'||x.version!==1||x.iterations!==ITERATIONS||x.cipher!=='AES-256-GCM'||x.kdf!=='PBKDF2-SHA256')throw Error('Unsupported vault format.');
  const s=un64(x.salt),iv=un64(x.iv),data=un64(x.data);
  if(s.length!==16||iv.length!==12||data.length<17)throw Error('Invalid vault.');return {x,s,iv,data};
 }
 async function derive(password,s){
  if(typeof password!=='string'||password.length<12||password.length>1024)throw Error('Use a password of 12–1024 characters.');
  const base=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:s,iterations:ITERATIONS,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 }
 async function seal(text,k,s){
  if(text.length>5000000)throw Error('Budget exceeds the 5 MB vault limit.');
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:AAD},k,enc.encode(text));
  return JSON.stringify({format:'take-control-local-vault',version:1,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,cipher:'AES-256-GCM',salt:b64(s),iv:b64(iv),data:b64(new Uint8Array(data))});
 }
 async function clear(e,k){return dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:e.iv,additionalData:AAD},k,e.data));}
 const api={
  exists(){return localStorage.getItem(SLOT)!==null;},
  active(){return key!==null;},
  pending(){return pending>0;},
  async unlock(password,validate){
   const raw=localStorage.getItem(SLOT),e=envelope(raw),k=await derive(password,e.s);
   const text=await clear(e,k);validate(JSON.parse(text));
   // Retry interrupted migration cleanup only after successful unlock/validation.
   localStorage.removeItem(PLAIN);
   key=k;salt=e.s;return JSON.parse(text);
  },
  async enable(state,password,validate){
   if(api.exists())throw Error('A vault already exists. Unlock it before making changes.');
   const text=JSON.stringify(state);validate(JSON.parse(text));
   const s=crypto.getRandomValues(new Uint8Array(16)),k=await derive(password,s),raw=await seal(text,k,s);
   // Verify the recovery path before touching the existing plaintext copy.
   if(await clear(envelope(raw),k)!==text)throw Error('Vault verification failed.');
   localStorage.setItem(SLOT,raw);
   if(localStorage.getItem(SLOT)!==raw)throw Error('Vault storage verification failed.');
   localStorage.removeItem(PLAIN);
   key=k;salt=s;
  },
  write(state){
   if(!key)return Promise.reject(Error('Vault is locked.'));
   const text=JSON.stringify(state),k=key,s=salt;pending++;
   // Later writes run even after a rejected write; no stale write can overtake a newer one.
   const task=queue.catch(()=>{}).then(async()=>{
    const raw=await seal(text,k,s);localStorage.setItem(SLOT,raw);
   });
   queue=task;
   return task.finally(()=>{pending--;});
  },
  async flush(){await queue;},
  async lock(){await queue;key=null;salt=null;}
 };
 root.TakeControlVault=api;
})(typeof window!=='undefined'?window:globalThis);
