/* Versioned, authenticated browser-only backup encryption. */
(function(root){
  'use strict';
  const enc = new TextEncoder(), dec = new TextDecoder('utf-8',{fatal:true});
  const ITERATIONS = 600000;
  const b64 = bytes => { let out=''; for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192)); return btoa(out); };
  const un64 = value => {
    if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw Error('Invalid encrypted backup');
    return Uint8Array.from(atob(value), c => c.charCodeAt(0));
  };
  const api = {
    isEncrypted: x => !!x && x.format === 'take-control-encrypted-backup',
    async encrypt(state,password){
      if (typeof password !== 'string' || password.length < 12) throw Error('Use a password of at least 12 characters.');
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const base = await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
      const key = await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt']);
      const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode('take-control-backup-v1'),tagLength:128},key,enc.encode(JSON.stringify(state)));
      return {format:'take-control-encrypted-backup',version:1,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,cipher:'AES-256-GCM',salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(ciphertext))};
    },
    async decrypt(file,password){
      if (!api.isEncrypted(file) || file.version !== 1 || file.kdf !== 'PBKDF2-SHA256' || file.cipher !== 'AES-256-GCM' || file.iterations !== ITERATIONS) throw Error('Unsupported encrypted backup format.');
      const salt=un64(file.salt),iv=un64(file.iv),data=un64(file.data);
      if(salt.length!==16||iv.length!==12||data.length<17) throw Error('Invalid encrypted backup');
      const base=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
      const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:file.iterations,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
      const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:enc.encode('take-control-backup-v1'),tagLength:128},key,data);
      return JSON.parse(dec.decode(clear));
    }
  };
  root.TakeControlBackup=api;
})(typeof window!=='undefined'?window:globalThis);
