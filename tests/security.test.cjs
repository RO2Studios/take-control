const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const ctx=vm.createContext({Date,Set,localStorage:{setItem(){throw Error('quota');}}});
function fn(n){const start=html.indexOf('  function '+n+'('),end=html.indexOf('\n  function ',start+5);return html.slice(start,end);}
for(const n of ['validateState','valid','parseBackup','commitImport'])vm.runInContext(fn(n),ctx);
const base=()=>({v:2,anchor:{day:20000,ts:1,balance:123},recs:[],tx:[],budget:{cats:[{id:'c0',name:'家族 & groceries',grp:'need',limit:100}]}});
function valid(s){ctx.s=s;return vm.runInContext('valid(s)',ctx);}
test('accepts version 2 budget and Unicode names',()=>assert.equal(valid(base()),true));
for(const [name,edit] of Object.entries({
 'attribute injection':s=>s.budget.cats[0].id='c" onclick="alert(1)',
 'null record':s=>s.budget.cats.push(null),
 'duplicate ID':s=>s.budget.cats.push({...s.budget.cats[0]}),
 'nonfinite balance':s=>s.anchor.balance=Infinity,
 'fractional cents':s=>s.anchor.balance=1.1,
 'invalid schedule':s=>s.recs.push({id:'r1',type:'out',cat:'Bills',name:'Bill',amt:1,freq:'monthly',start:'2026-02-30'}),
 'reserved key':s=>s.rules=JSON.parse('{"__proto__":{}}'),
 'wrong names type':s=>s.names={}
}))test('rejects '+name,()=>{const s=base();edit(s);assert.equal(valid(s),false);});
test('oversize text fails before parsing',()=>assert.throws(()=>vm.runInContext('parseBackup("x".repeat(5000001))',ctx)));
test('imported HTML summary is dropped',()=>{ctx.text=JSON.stringify({...base(),lastImport:{head:'hi',body:'<img onerror=alert(1)>'}});assert.equal(vm.runInContext('parseBackup(text).lastImport',ctx),undefined);});
test('storage quota error preserves live state',()=>{ctx.state=base();const old=ctx.state;ctx.next=base();assert.throws(()=>vm.runInContext('commitImport(next)',ctx));assert.equal(ctx.state,old);});
test('CSP matches executable inline scripts',()=>require('node:child_process').execFileSync(process.execPath,['scripts/csp.cjs','--check']));
const sw=fs.readFileSync('sw.js','utf8');
test('worker leaves sibling caches and unexpected requests alone',async()=>{
 const events={},removed=[];let response;
 const c={match:async()=>({cached:true}),put:async()=>{throw Error('must not overwrite on error');}};
 const context={URL,Set,Promise,caches:{keys:async()=>['unrelated-app-canary','takecontrol-v54','takecontrol-v55'],delete:async k=>removed.push(k),open:async()=>c},fetch:async()=>({ok:false,status:500}),self:{location:{href:'https://example.test/take-control/sw.js'},clients:{claim:async()=>{}},addEventListener:(n,fn)=>events[n]=fn}};
 vm.runInNewContext(sw,context);await events.activate({waitUntil:p=>response=p});await response;assert.deepEqual(removed,['takecontrol-v54']);
 for(const url of ['https://evil.test/a','https://example.test/api/private'])events.fetch({request:{method:'GET',url},respondWith:()=>assert.fail('unexpected intercepted URL')});
 events.fetch({request:{method:'GET',mode:'navigate',url:'https://example.test/take-control/'},respondWith:p=>response=p});assert.deepEqual(await response,{cached:true});
});
test('actual current sample remains a valid version 2 backup',()=>{
 vm.runInContext(html.match(/<script id="logic">([\s\S]*?)<\/script>/)[1],ctx);
 vm.runInContext('var DEFAULT_CATS = '+html.split('  var DEFAULT_CATS = ')[1].split(';')[0]+';',ctx);
 for(const n of ['defaultCats','makeBlank','makeSample'])vm.runInContext(fn(n),ctx);
 ctx.todayNum=()=>20760;
 assert.equal(vm.runInContext('valid(makeBlank()) && valid(makeSample())',ctx),true);
});
test('credential guard rejects synthetic credentials',()=>{
 const {matches}=require('../scripts/check-secrets.cjs');
 assert.equal(matches('ghp_'+'a'.repeat(40)),true);
 assert.equal(matches('-----BEGIN '+'PRIVATE KEY-----'),true);
 assert.equal(matches('Ordinary budget description'),false);
});
