const {test}=require('node:test'),assert=require('node:assert/strict');
require('../encrypted-backup.js');
const api=globalThis.TakeControlBackup,pw='correct-horse-2026';
test('encrypted backup round trip, random salt/IV, wrong password and tampering',async()=>{
 const s={v:2,secret:'Synthetic budget 家族'};
 const a=await api.encrypt(s,pw),b=await api.encrypt(s,pw);
 assert.notEqual(a.data,b.data);assert.notEqual(a.salt,b.salt);assert.notEqual(a.iv,b.iv);
 assert.ok(!JSON.stringify(a).includes(s.secret));assert.deepEqual(await api.decrypt(a,pw),s);
 await assert.rejects(api.decrypt(a,'wrong-password'));
 const data=Buffer.from(a.data,'base64');data[0]^=1;
 await assert.rejects(api.decrypt({...a,data:data.toString('base64')},pw));
 await assert.rejects(api.decrypt({...a,iterations:1},pw));
 await assert.rejects(api.encrypt(s,'short'));
});
