'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'money-levels.js'),'utf8');
const c={};c.globalThis=c;vm.runInNewContext(src,c);const L=c.TakeControlLevels;
const base=()=>({sample:false,budget:{done:false},tx:[],recs:[],learned:{},reviews:[],goals:{ef:null}});
test('four distinct levels have unique names icons and colors',()=>{
 assert.equal(L.levels.length,4);
 assert.equal(JSON.stringify(L.levels.map(l=>l.name)),JSON.stringify(['Money Rookie','Money Builder','Money Strategist','Money Master']));
 for(const key of ['name','icon','color'])assert.equal(new Set(L.levels.map(l=>l[key])).size,4);
 assert.equal(L.levels[3].icon,'trophy');
});
test('budget planning and knowledge checks award deterministic one-time missions',()=>{
 const s=base();assert.equal(L.progress(s).level,1);
 s.budget.done=true;assert.equal(L.progress(s).xp,50);
 s.learned.credit101=1;assert.equal(L.progress(s).xp,70);
 s.learned.credit101=1;assert.equal(L.progress(s).xp,70);
 s.tx.push({type:'out',amt:2000});assert.equal(L.progress(s).level,2);
});
test('real planning, reviews, lessons and logs progress to level four',()=>{
 const s=base();s.budget.done=true;s.tx=Array.from({length:10},(_,i)=>({id:'t'+i,type:'out',amt:1000}));
 s.learned={zero:1,pay:1,credit101:1,creditcost:1,creditscore:1,ef:1};
 s.recs=[{type:'out',freq:'annual'}];s.reviews=[{s:1},{s:2},{s:3}];s.goals.ef={target:100000};
 const p=L.progress(s);assert.equal(p.level,4);assert.equal(p.percent,100);
});
test('larger balances and increased spending do not award points',()=>{
 const a=base(),b=base();a.anchor={balance:100};b.anchor={balance:999999999};
 a.tx=[{type:'out',amt:100}];b.tx=[{type:'out',amt:9999999}];
 assert.equal(L.progress(a).xp,L.progress(b).xp);
});
test('highest previously earned points cannot be lost by editing a bill',()=>{
 const s=base();s.moneyXPHigh=190;
 const p=L.progress(s);assert.equal(p.level,3);
});
test('integrated UI is compact by default, expandable, and retains existing Today budget',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const css=fs.readFileSync(path.join(root,'ui.css'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.ok(html.includes('id="moneyLevelRoot"'));
 assert.ok(html.includes('id="moneyLevelDetails"'));
 assert.ok(html.includes("localStorage.getItem('moneyAhead.levelExpanded')"));
 assert.ok(html.includes("localStorage.setItem('moneyAhead.levelExpanded'"));
 assert.ok(html.includes('ml-bar-label'));
 assert.ok(html.includes('id="todayGrid"'));
 assert.ok(html.includes('renderDaily(); renderDayUpcoming();'));
 assert.ok(html.includes('id="moneyLevelCelebration"'));
 assert.ok(html.includes("if(!state.sample)pendingMoneyLevelUp=p.level"));
 assert.ok(html.includes("if(openLesson.pick===L0.q.answer)state.learned[L0.id] = 1"));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert.ok(sw.includes("'money-levels.js'"));
 assert.ok(sw.includes('takecontrol-v54'));
 assert.ok(html.includes('ui.css?v=54'));
 for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
});

test('mockup-faithful compact responsive card, connected stages and overlay remain accessible',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const css=fs.readFileSync(path.join(root,'ui.css'),'utf8');
 assert.match(css, /#moneyLevelRoot \{ width:100%; max-width:620px/);
 assert.match(css, /#moneyLevelRoot \.ml-journey::before/);
 assert.match(css, /#moneyLevelRoot \.ml-mission-trigger/);
 assert.match(css, /@media\(max-width:420px\)/);
 assert.match(css, /\.ml-ribbon/);
 assert.match(css, /\.ml-rewards/);
 assert.ok(html.includes('class="ml-bar-label"'));
 assert.ok(html.includes('role="dialog" aria-modal="true"'));
 assert.ok(html.includes("data-act=\"viewMoneyMissions\""));
 assert.ok(html.includes("data-act=\"closeMoneyLevel\""));
 assert.ok(html.includes('moneyLevelDetails'));
 assert.ok(html.includes('renderDaily(); renderDayUpcoming();'));
 for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
});

test('milestones use approved cartoon art with the correct status and celebration images',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.ok(html.includes('moneyLevelBadge(l.icon)'));
 for(const asset of ['level-celebration','level-ribbon']){
   assert.ok(sw.includes('icons/'+asset+'.webp'));
   assert.ok(html.includes(asset));
 }
 assert.ok(!html.includes("moneyLevelBadge(status==='done'"));
 assert.ok(html.includes('moneyLevelBadge(p.current.icon)'));
 assert.ok(html.includes('ml-celebration-art'));
});

test('level badges use the approved cartoon files and include them offline',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'ui.css'),'utf8'),sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 for(const name of ['rookie','builder','strategist','master']){
  const file='icons/money-'+name+'-cartoon.webp';
  assert.ok(fs.existsSync(path.join(root,file)));
  assert.ok(sw.includes(file));
 }
 assert.match(html,/ml-approved-badge/);
 assert.match(css,/img\.ml-approved-badge/);
});

test('journey percentage never resets on promotion and reaches 100 only at Master',()=>{
 const cases=[[0,1,0],[24,1,8],[50,1,17],[79,1,27],[80,2,27],[169,2,58],[170,3,58],[180,3,62],[289,3,99],[290,4,100],[1000,4,100]];
 let last=-1;
 for(const [xp,level,percent] of cases){
  const s=base();s.moneyXPHigh=xp;const p=L.progress(s);
  assert.equal(p.level,level);assert.equal(p.percent,percent);assert.ok(p.percent>=last);last=p.percent;
 }
 const s=base();s.moneyXPHigh=180;assert.equal(L.progress(s).levelPercent,8);
});
