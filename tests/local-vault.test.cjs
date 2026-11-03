const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{webcrypto}=require('node:crypto');
const source=fs.readFileSync('local-vault.js','utf8'),pw='test-only-password-2026';
function fixture(store=new Map()){
 let fail=false;
 const storage={getItem:k=>store.get(k)??null,setItem(k,v){if(fail)throw Error('quota');store.set(k,v);},removeItem:k=>store.delete(k)};
 const ctx=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,JSON,Promise,btoa,atob,localStorage:storage});vm.runInContext(source,ctx);
 return {api:ctx.TakeControlVault,store,fail:x=>fail=x};
}
const validate=s=>{if(s.v!==2)throw Error('invalid state');};
test('migration verifies encrypted storage, deletes plaintext, locks and unlocks without persisted key',async()=>{
 const {api,store}=fixture();const state={v:2,balance:1234,secret:'synthetic-canary'};store.set('moneyAhead.v2',JSON.stringify(state));
 await api.enable(state,pw,validate);assert.equal(store.has('moneyAhead.v2'),false);assert.equal(api.active(),true);
 assert.equal(store.size,1);assert.ok(!store.get('moneyAhead.vault.v1').includes(state.secret));
 await api.lock();assert.equal(api.active(),false);
 const next=fixture(store);await assert.rejects(next.api.unlock('wrong-password-123',validate));assert.equal(next.api.active(),false);
 assert.deepEqual(JSON.parse(JSON.stringify(await next.api.unlock(pw,validate))),state);
});
test('failed migration and quota errors preserve previous saved copies',async()=>{
 const f=fixture();f.store.set('moneyAhead.v2','original');f.fail(true);
 await assert.rejects(f.api.enable({v:2},pw,validate));assert.equal(f.store.get('moneyAhead.v2'),'original');assert.equal(f.api.active(),false);
 f.fail(false);await f.api.enable({v:2,amount:1},pw,validate);const before=f.store.get('moneyAhead.vault.v1');
 f.fail(true);await assert.rejects(f.api.write({v:2,amount:2}));assert.equal(f.store.get('moneyAhead.vault.v1'),before);assert.equal(f.api.pending(),false);
 f.fail(false);await f.api.write({v:2,amount:3});await f.api.lock();assert.equal((await f.api.unlock(pw,validate)).amount,3);
});
test('writes are ordered, tampering fails, invalid recovery data never replaces plaintext',async()=>{
 const f=fixture();await f.api.enable({v:2,amount:0},pw,validate);
 await Promise.all([f.api.write({v:2,amount:1}),f.api.write({v:2,amount:2}),f.api.write({v:2,amount:3})]);
 await f.api.lock();assert.equal((await f.api.unlock(pw,validate)).amount,3);await f.api.lock();
 const envelope=JSON.parse(f.store.get('moneyAhead.vault.v1'));const data=Buffer.from(envelope.data,'base64');data[0]^=1;envelope.data=data.toString('base64');f.store.set('moneyAhead.vault.v1',JSON.stringify(envelope));
 await assert.rejects(f.api.unlock(pw,validate));assert.equal(f.api.active(),false);
 const fresh=fixture();fresh.store.set('moneyAhead.v2','original');await assert.rejects(fresh.api.enable({v:3},pw,validate));assert.equal(fresh.store.get('moneyAhead.v2'),'original');
});
