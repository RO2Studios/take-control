const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('backup-save.js','utf8');
test('folder selection writes and closes before confirming, with no silent download on cancel',async()=>{
 const calls=[],file={name:'backup.json'};let cancel=false,fail=false;
 const ctx=vm.createContext({navigator:{},showSaveFilePicker:async o=>{calls.push(o.suggestedName);if(cancel)throw Object.assign(Error(),{name:'AbortError'});return {createWritable:async()=>({write:async f=>{assert.equal(f,file);calls.push('write');if(fail)throw Error('disk full');},close:async()=>calls.push('close'),abort:async()=>calls.push('abort')})};}});
 vm.runInContext(source,ctx);const api=ctx.TakeControlSave;
 assert.equal(api.canChooseFolder(),true);assert.match(await api.save(file,'folder'),/saved/);assert.deepEqual(calls,['backup.json','write','close']);
 cancel=true;await assert.rejects(api.save(file,'folder'),{name:'AbortError'});assert.equal(calls.filter(x=>x==='write').length,1);
 cancel=false;fail=true;await assert.rejects(api.save(file,'folder'));assert.equal(calls.at(-1),'abort');
});
test('share is called synchronously from the user action and never claims a verified save',async()=>{
 let invoked=false,fail=false;const file={name:'backup.json'};
 const ctx=vm.createContext({navigator:{canShare:()=>true,share:args=>{invoked=true;assert.equal(args.files[0],file);return fail?Promise.reject(Object.assign(Error(),{name:'AbortError'})):Promise.resolve();}}});vm.runInContext(source,ctx);
 const api=ctx.TakeControlSave;assert.equal(api.canShare(file),true);const pending=api.save(file,'share');assert.equal(invoked,true);assert.match(await pending,/Check the folder/);
 fail=true;await assert.rejects(api.save(file,'share'),{name:'AbortError'});
});
