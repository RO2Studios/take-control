'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','money-insights.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const ctx={Date,Math};ctx.globalThis=ctx;vm.runInNewContext(src,ctx);
const A=ctx.TakeControlInsights;
const d=s=>A.parseDate(s);
test('annual bill hits same anniversary and clamps leap-day renewal',()=>{
 const r={freq:'annual',start:'2024-02-29'};
 assert.equal(A.hits(r,d('2025-02-28')),true);
 assert.equal(A.hits(r,d('2025-03-01')),false);
 assert.equal(A.hits(r,d('2026-02-28')),true);
 assert.equal(A.nextDue(r,d('2025-03-01')),d('2026-02-28'));
});
test('quarterly renewal uses due dates only and never charges early',()=>{
 const r={freq:'quarterly',start:'2026-01-31'};
 assert.equal(A.hits(r,d('2026-04-30')),true);
 assert.equal(A.hits(r,d('2026-05-01')),false);
 assert.equal(A.hits(r,d('2026-07-31')),true);
 assert.equal(A.nextDue(r,d('2026-02-01')),d('2026-04-30'));
});
test('subscription cost summaries do not double-count billing cycles',()=>{
 const r=[{type:'out',name:'Yearly',amt:12000,freq:'annual',kind:'subscription'}, {type:'out',name:'Monthly',amt:1000,freq:'monthly',cat:'Subscriptions'}, {type:'out',name:'Other',amt:4500,freq:'monthly',cat:'Utilities'}];
 const x=A.subscriptionTotals(r);assert.equal(x.annual,24000);assert.equal(x.monthly,2000);assert.equal(x.items.length,2);
});
test('recommends per-paycheck deposits based on scheduled checks before due date',()=>{
 const r={freq:'annual',start:'2026-12-31',amt:60000};
 const p=[{type:'in',start:'2026-11-06',freq:'biweekly'}];
 const a=A.paycheckAdvice(r,p,d('2026-11-02'),0);
 assert.equal(a.payments,4);assert.equal(a.perPaycheck,15000);
 const saved=A.paycheckAdvice(r,p,d('2026-11-02'),20000);assert.equal(saved.perPaycheck,10000);
});
test('no payday before due date produces explicit missing schedule result',()=>{
 const r={freq:'annual',start:'2026-11-03',amt:30000};
 const p=[{type:'in',start:'2026-11-10',freq:'biweekly'}];
 const x=A.paycheckAdvice(r,p,d('2026-11-02'),0);assert.equal(x.perPaycheck,null);
});
test('food delivery insights include delivery merchants but not ride shares',()=>{
 const tx=[{type:'out',note:'DOORDASH',amt:3000,day:d('2026-11-01')},{type:'out',note:'Uber Eats',amt:2200,day:d('2026-11-02')},{type:'out',note:'Uber ride',amt:2900,day:d('2026-11-02')}];
 const x=A.foodDelivery(tx,d('2026-11-02'));assert.equal(x.amount,5200);assert.equal(x.count,2);
});
test('credit card estimate is an approximation not a transaction',()=>{
 assert.equal(A.debtCost({amt:300000,apr:24}),6000);
 assert.equal(A.debtCost({amt:300000,apr:-1}),null);
});
test('original inline scripts parse and new module is cached offline',()=>{
 for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
 new vm.Script(src);
 const sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
 assert.ok(sw.includes("'money-insights.js'"));
 assert.ok(html.includes('src="money-insights.js"'));
 assert.ok(html.indexOf('src="money-insights.js"')<html.indexOf('<script id="logic">'));
 assert.ok(!html.includes('src="money-insights.js" defer'));
 assert.ok(html.includes('Create my budget'));
});


test('review uses only the redesigned three expandable insight cards',()=>{
 assert.match(html,/root\.innerHTML = moneyInsightsHTML\(\)\+h/);
 for(const id of ['subscriptions','food','credit'])assert.ok(html.includes("insightCard('"+id+"'"));
 assert.match(html,/name="money-insights"/);
 assert.match(html,/class="mi-chevron"/);
 assert.doesNotMatch(html,/<h2>Money insights<\/h2>/);
});
test('new credit fundamentals lessons contain correct quiz structure and are grouped',()=>{
 const src=html.match(/var LESSONS = (\[[^\n]*\]);/)[1];
 const lessons=JSON.parse(src);
 assert.equal(lessons.length,15);
 for(const id of ['credit101','creditcost','creditscore']){
   const lesson=lessons.find(x=>x.id===id);
   assert.ok(lesson&&lesson.body.length>=3);
   assert.equal(lesson.q.options.length,3);
   assert.ok(lesson.q.answer>=0&&lesson.q.answer<3);
 }
 assert.ok(html.includes('Credit cards &amp; credit fundamentals'));
});
test('UI stylesheet and offline cache stay in sync for this release',()=>{
 const css=fs.readFileSync(path.join(__dirname,'..','ui.css'),'utf8');
 const sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
 assert.match(css,/\.mi-card\[open\] \.mi-chevron/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.ok(html.includes('href="ui.css?v=47"'));
 assert.ok(sw.includes("'ui.css?v=47'"));
 assert.ok(sw.includes('takecontrol-v47'));
});

test('recognized merchants render distinct offline brand icons',()=>{
 const sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
 for(const slug of ['doordash','ubereats','postmates']){
  const pathName='icons/brand-'+slug+'.svg';
  const logo=fs.readFileSync(path.join(__dirname,'..',pathName),'utf8');
  assert.match(logo,/<svg/);
  assert.ok(sw.includes(pathName));
  assert.ok(html.includes("'"+slug+"'"));
 }
 assert.ok(html.includes('mi-brand-'+"'"));
});

test('subscription brand logos are bundled and included in offline cache',()=>{
 const sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
 for(const slug of ['icloud','netflix']){
   const file='icons/brand-'+slug+'.svg';
   assert.match(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),/<svg/);
   assert.ok(sw.includes(file));
   assert.ok(html.includes("brand='"+slug+"'"));
 }
 assert.ok(html.includes("mi-brand-'+brand"));
});

test('three supported credit networks render local logo assets with generic fallback',()=>{
 const sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
 for(const slug of ['visa','mastercard','americanexpress']){
  const file='icons/brand-'+slug+'.svg';
  assert.match(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),/<svg/);
  assert.ok(sw.includes(file),'offline cache contains '+file);
  assert.ok(html.includes("'"+slug+"'"),'network supported '+slug);
 }
 assert.ok(html.includes("var brand=kind==='food'"));
 assert.ok(html.includes("kind==='credit'"));
 assert.ok(html.includes("return insightLine(r.name"));
 assert.ok(html.includes("r.cardNetwork"));
});
test('new and existing cards have a selectable network, only for credit records',()=>{
 assert.match(html,/name="cardNetwork"/);
 assert.match(html,/data-network-id/);
 assert.match(html,/r\.kind==='credit'/);
 assert.match(html,/Generic \/ Unknown/);
 const css=fs.readFileSync(path.join(__dirname,'..','ui.css'),'utf8');
 assert.match(css,/card-network-field/);
});

test('mobile navigation uses green background and white icon labels while desktop is unaffected',()=>{
 const css=fs.readFileSync(path.join(__dirname,'..','ui.css'),'utf8');
 assert.match(css, /@media \(max-width: 899px\) \{\s*#tabs\.tabs \{/);
 assert.match(css, /#tabs\.tabs \{\s*background: #15803d/);
 assert.match(css, /#tabs \.tab svg \{[\s\S]*?color: #ffffff/);
 assert.match(css, /#tabs \.tab\[aria-current="page"\] \{/);
 assert.ok(html.includes('href="ui.css?v=47"'));
});

test('selected mobile tile inverts white background and green text and icon',()=>{
 const css=fs.readFileSync(path.join(__dirname,'..','ui.css'),'utf8');
 const block=css.slice(css.lastIndexOf('/* Mobile navigation:'));
 assert.match(block,/#tabs \.tab\[aria-current="page"\] \{\s*background: #ffffff;\s*border-color: #ffffff;\s*color: #15803d;/);
 assert.match(block,/#tabs \.tab\[aria-current="page"\] b,[\s\S]*?#tabs \.tab\[aria-current="page"\] svg \{\s*color: #15803d;/);
 assert.match(block,/#tabs \.tab \{\s*background: transparent/);
});

test('credit lessons have distinctive illustrated artwork instead of default generic icons',()=>{
 const art=html.slice(html.indexOf('var ART = {'),html.indexOf('var PHOTOS ='));
 for(const id of ['credit101','creditcost','creditscore']){
  assert.ok(art.includes(id+": ['"),id+' illustration present');
 }
 assert.match(html,/var a = ART\[id\] \|\| ART\.zero/);
});
