'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'..','encrypted-backup.js'),'utf8');
const sandbox={crypto:webcrypto,TextEncoder,TextDecoder,btoa,atob,Uint8Array,JSON,Error};
sandbox.globalThis=sandbox;
vm.runInNewContext(source,sandbox);
const codec=sandbox.TakeControlBackup;
const sample=()=>({v:2,anchor:{day:20759,balance:23000},recs:[],tx:[{id:'a',day:20759,type:'out',amt:375}],budget:{done:true,cats:[]}});
test('AES-GCM encrypted backup round trips full state without plaintext',async()=>{
 const input=sample(),sealed=await codec.encrypt(input,'correct horse battery staple');
 assert.equal(sealed.format,'take-control-encrypted-backup');
 assert.equal(sealed.version,1);
 assert.ok(!JSON.stringify(sealed).includes('"balance":23000'));
 assert.deepEqual(JSON.parse(JSON.stringify(await codec.decrypt(sealed,'correct horse battery staple'))),input);
});
test('new salt and IV give different ciphertext for same data',async()=>{
 const a=await codec.encrypt(sample(),'longer secure password'),b=await codec.encrypt(sample(),'longer secure password');
 assert.notEqual(a.salt,b.salt); assert.notEqual(a.iv,b.iv); assert.notEqual(a.data,b.data);
});
test('wrong password rejects',async()=>{
 const sealed=await codec.encrypt(sample(),'this is a long password');
 await assert.rejects(codec.decrypt(sealed,'not the right password'));
});
test('ciphertext tampering rejects',async()=>{
 const sealed=await codec.encrypt(sample(),'this is a long password');
 const tampered={...sealed,data:sealed.data.slice(0,-8)+'AAAAAAAA'};
 await assert.rejects(codec.decrypt(tampered,'this is a long password'));
});
test('metadata tampering and unsupported format reject',async()=>{
 const sealed=await codec.encrypt(sample(),'this is a long password');
 await assert.rejects(codec.decrypt({...sealed,iterations:1},'this is a long password'));
 await assert.rejects(codec.decrypt({...sealed,version:2},'this is a long password'));
 await assert.rejects(codec.decrypt({...sealed,iv:'AQ=='},'this is a long password'));
});
test('short passwords reject',async()=>{
 await assert.rejects(codec.encrypt(sample(),'short'));
});
test('large budget exports without call-stack overflow',async()=>{
 const big=sample();big.tx=Array.from({length:3000},(_,i)=>({id:'transaction-'+i,type:'out',day:20759,amt:100,note:'groceries test '.repeat(12)}));
 const sealed=await codec.encrypt(big,'a sufficiently long backup password');
 assert.equal((await codec.decrypt(sealed,'a sufficiently long backup password')).tx.length,3000);
});
test('UI retains legacy import and non-destructive preview, plus script loads',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.match(html,/encrypted-backup\.js/);
 assert.match(html,/older UNENCRYPTED backup/);
 assert.match(html,/validBackupDeep\(inc\)/);
 assert.match(html,/Backup contains/);
 assert.match(html,/localStorage\.setItem\(KEY,serialized\)/);
 assert.match(html,/Create my budget/);
 const sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
 assert.ok(sw.includes("'encrypted-backup.js'"));
 assert.match(sw,/takecontrol-v33/);
});
