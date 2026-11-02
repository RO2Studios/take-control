const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const logic = html.match(/<script id="logic">([\s\S]*?)<\/script>/)[1];
const sandbox = vm.createContext({ Date });
vm.runInContext(logic, sandbox);
function evaluate(code) { return vm.runInContext(code, sandbox); }
function sourceFunction(name) {
  const start = html.indexOf('  function ' + name + '(');
  const end = html.indexOf('\n  function ', start + 10);
  return html.slice(start, end);
}
// Exercise the actual sample builder and parser without booting the document UI.
evaluate('var DEFAULT_CATS = ' + html.split('  var DEFAULT_CATS = ')[1].split(';')[0] + ';');
for (const name of ['defaultCats', 'makeBlank', 'makeSample', 'strictMoney']) evaluate(sourceFunction(name));
evaluate(`
  const TODAY = dayNum(2026, 11, 1);
  function base() {
    return { anchor: {day:TODAY,ts:1,balance:10000}, buffer:0, dailyOverride:0, recs:[], tx:[],
      budget:{cats:[{id:'g',name:'Groceries',limit:90000}],months:{}} };
  }
  function purchase(amt, day=TODAY) { return {id:'check',ts:2,day,type:'out',amt,cat:'Groceries'}; }
`);

test('warns about an interim shortfall even with a positive ending balance', () => {
  const r = evaluate(`(() => { const s=base(); s.recs=[
    {type:'out',name:'Rent',amt:165000,freq:'monthly',start:'2026-10-02'},
    {type:'in',name:'Pay',amt:300000,freq:'monthly',start:'2026-10-10'}];
    return purchaseImpact(s,TODAY,purchase(4000,TODAY+1)); })()`);
  assert.ok(r.after.days[29].bal > 0);
  assert.equal(r.low.bal, -159000);
  assert.equal(r.firstShort.n, evaluate('TODAY+1'));
});

test('checks the cushion when cash stays above zero', () => {
  const r = evaluate(`(() => { const s=base(); s.buffer=5000; return purchaseImpact(s,TODAY,purchase(6000)); })()`);
  assert.equal(r.low.bal, 4000);
  assert.ok(r.firstShort);
});

test('detects an immediate shortfall on the current day', () => {
  const r = evaluate('purchaseImpact(base(),TODAY,purchase(15000))');
  assert.equal(r.firstShort.n, evaluate('TODAY'));
  assert.equal(r.low.bal, -5000);
});

test('does not flag a balance exactly equal to the cushion', () => {
  const r = evaluate(`(() => { const s=base(); s.buffer=5000; return purchaseImpact(s,TODAY,purchase(5000)); })()`);
  assert.equal(r.firstShort, null);
});

test('reserves future purchases against their category budget', () => {
  const r = evaluate(`(() => { const s=base(); s.budget.cats[0].limit=20000;
    s.tx=[purchase(8000,TODAY+5)]; return purchaseImpact(s,TODAY,purchase(15000,TODAY+1)); })()`);
  assert.equal(r.categoryLeft, -3000);
  assert.equal(r.dailyLeft, null);
});

test('uses the purchase month and its saved limits', () => {
  const r = evaluate(`(() => { const s=base(); s.budget.months['2026-12']={limits:{g:5000}};
    s.tx=[purchase(10000,TODAY)]; return purchaseImpact(s,TODAY,purchase(6000,TODAY+30)); })()`);
  assert.equal(r.categoryMonth, '2026-12');
  assert.equal(r.categoryLeft, -1000);
});

test('isolates purchase cost without increasing the future spending pace', () => {
  const r = evaluate(`(() => { const s=base(); s.dailyOverride=null; s.anchor.day=TODAY-10;
    s.tx=[purchase(1000,TODAY-1)]; return purchaseImpact(s,TODAY,purchase(1000)); })()`);
  assert.equal(r.before.days[29].bal - r.after.days[29].bal, 1000);
  assert.equal(r.before.est, r.after.est);
});

test('checking a purchase does not mutate saved transactions or budget', () => {
  assert.equal(evaluate(`(() => { const s=base(), before=JSON.stringify(s); purchaseImpact(s,TODAY,purchase(15000)); return JSON.stringify(s)===before; })()`), true);
});

test('handles zero-balance budgets and income checks', () => {
  const r = evaluate(`(() => { const s=base(); s.anchor.balance=0; s.budget.cats=[];
    return purchaseImpact(s,TODAY,{id:'deposit',ts:2,day:TODAY,type:'in',amt:10000,cat:'Paycheck'}); })()`);
  assert.equal(r.low.bal, 10000);
  assert.equal(r.categoryLeft, null);
  assert.equal(r.firstShort, null);
});

test('rejects malformed amounts and keeps exact cents', () => {
  for (const amount of ['12.34.56', '-10', '1e3', '2 dollars', '1,00', '0.001', 'Infinity']) {
    assert.equal(evaluate(`strictMoney(${JSON.stringify(amount)})`), null);
  }
  assert.equal(evaluate("strictMoney('$1,234.56')"), 123456);
  assert.equal(evaluate("strictMoney('44.93')"), 4493);
});

test('every inline script parses and the offline shell contains the new stylesheet', () => {
  for (const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  const stylesheet = html.match(/href="(ui\.css[^"]*)"/)[1];
  assert.ok(sw.includes("'" + stylesheet + "'"), 'offline shell caches the versioned stylesheet');
});

test('the original example warns for $400 groceries tomorrow', () => {
  const r = evaluate(`(() => { const original=todayNum; todayNum=()=>TODAY;
    try { return purchaseImpact(makeSample(),TODAY,purchase(40000,TODAY+1)); }
    finally { todayNum=original; } })()`);
  assert.equal(r.low.bal, -4361);
  assert.equal(r.after.days[29].bal, 37449);
  assert.equal(r.categoryLeft, 37160);
});

test('example budget demonstrates all new financial insights without changing the v2 schema', () => {
  const sample = evaluate('makeSample()');
  assert.equal(sample.v, 2);
  assert.equal(sample.sample, true);
  assert.ok(sample.recs.some(r => r.freq === 'annual' && r.kind === 'subscription'));
  assert.ok(sample.recs.some(r => r.freq === 'annual' && r.kind === 'bill'));
  assert.ok(sample.recs.some(r => r.freq === 'quarterly'));
  const credit = sample.recs.filter(r => r.kind === 'credit');
  assert.equal(credit.length, 3);
  assert.ok(credit.every(r => Number.isFinite(r.apr) && r.cardBalance > 0));
  assert.ok(sample.tx.some(t => /door.?dash/i.test(t.note)));
  assert.ok(sample.tx.some(t => /uber eats/i.test(t.note)));
  assert.ok(sample.recs.filter(r => ['annual','quarterly'].includes(r.freq)).every(r => r.start > new Date(Date.now()).toISOString().slice(0,10)));
});

test('new example budget includes Visa Mastercard and American Express card networks',()=>{
 const sample=evaluate('makeSample()');
 const networks=sample.recs.filter(r=>r.kind==='credit').map(r=>r.cardNetwork).sort();
 assert.equal(networks.join(','),'americanexpress,mastercard,visa');
});

test('actual demo and an identical real budget earn the same level and overall progress',()=>{
 evaluate(fs.readFileSync(path.join(__dirname,'..','money-levels.js'),'utf8'));
 const result=evaluate(`(() => {
  const sample=makeSample(),real=JSON.parse(JSON.stringify(sample));real.sample=false;
  return {demo:TakeControlLevels.progress(sample),real:TakeControlLevels.progress(real)};
 })()`);
 assert.deepEqual(JSON.parse(JSON.stringify(result.demo)),JSON.parse(JSON.stringify(result.real)));
 assert.equal(result.demo.xp,180);
 assert.equal(result.demo.level,3);
 assert.equal(result.demo.percent,62);
 assert.equal(result.demo.levelPercent,8);
 assert.equal(result.demo.completed,6);
});
