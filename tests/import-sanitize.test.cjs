const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Run the shipped sanitizer out of index.html against hostile backup contents.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('  var S_TOKEN = '), end = html.indexOf('  function norm(s)');
const sandbox = {}; vm.createContext(sandbox);
vm.runInContext('function todayNum(){ return 20000; }\n' + html.slice(start, end), sandbox);
const PAY = '"><img src=x onerror="alert(1)">';
const base = () => ({ v: 2, anchor: { balance: 100, day: 20000, ts: 1 }, names: ['Jordan'], partner: '', givePct: 10,
  recs: [{ id: 'r1', type: 'out', name: 'Rent', amt: 100000, freq: 'monthly', start: '2026-11-01', cat: 'Housing', kind: 'bill', apr: 19.5 }],
  tx: [{ id: 't1', ts: 1, day: 20000, type: 'out', amt: 450, cat: 'Gas & transport', note: 'Trader Joe\'s 27" TV <sale>', by: 'Jordan' }],
  budget: { done: true, step: 0, cats: [{ id: 'c0', name: 'Gas & transport', grp: 'need', limit: 5000 }], months: {} },
  goals: { asked: true, picks: ['payday'], ef: null }, rules: { "trader joe's": 'Gas & transport' } });
const run = s => JSON.parse(JSON.stringify(sandbox.sanitizeState(s)));

test('clean data passes through the import sanitizer unchanged, including punctuation in free text', () => {
  const before = base(); const after = run(base());
  assert.deepEqual(after, before);
});

test('identifiers and codes that carry markup are rejected, so they can never reach the page', () => {
  const s = base();
  s.budget.cats.push({ id: PAY, name: 'Evil', grp: 'need', limit: 1 });
  s.recs.push({ id: PAY, type: 'out', name: 'Evil', amt: 1, freq: 'monthly', start: '2026-11-01' });
  s.tx.push({ id: PAY, day: 20000, amt: 1, type: 'out' });
  s.recs[0].cardNetwork = PAY; s.recs[0].kind = PAY; s.recs[0].freq = PAY; s.budget.cats[0].grp = PAY; s.goals.picks.push(PAY);
  const out = run(s);
  assert.equal(out.budget.cats.length, 1); assert.equal(out.recs.length, 1); assert.equal(out.tx.length, 1);
  assert.equal(out.recs[0].cardNetwork, ''); assert.equal(out.recs[0].kind, ''); assert.equal(out.recs[0].freq, 'monthly');
  assert.deepEqual(out.goals.picks, ['payday']);
  assert.ok(!JSON.stringify(out).includes('onerror'));
});

test('numbers must be numbers: text in a numeric field cannot be used to inject markup or crash a screen', () => {
  const s = base(); s.givePct = PAY; s.recs[0].apr = PAY; s.recs[0].amt = '250'; s.anchor.balance = Infinity; s.budget.cats[0].limit = { a: 1 };
  const out = run(s);
  assert.equal(out.givePct, 0); assert.equal(out.recs[0].apr, 0); assert.equal(out.recs[0].amt, 250); assert.equal(out.budget.cats[0].limit, 0);
  assert.equal(typeof out.anchor.balance, 'number');
});

test('malformed rows and wrong shapes are dropped instead of breaking the app', () => {
  const s = base(); s.tx.push(null, {}, 'x'); s.recs.push(null, {}, { id: 'r9', amt: 1, start: 'not-a-date' }); s.budget.cats.push(null);
  s.goals = 'x'; s.names = [null, 5, 'Sam']; s.reviews = [null, { s: 1 }]; s.inbox = [null]; s.cancel = [null]; s.rules = 'x';
  const out = run(s);
  assert.equal(out.tx.length, 1); assert.equal(out.recs.length, 1); assert.equal(out.budget.cats.length, 1);
  assert.deepEqual(out.goals.picks, []); assert.deepEqual(out.names, ['Sam']); assert.equal(out.reviews.length, 1);
  assert.equal(out.inbox.length, 0); assert.equal(out.cancel.length, 0); assert.equal(out.rules, undefined);
});

test('prototype keys are stripped and unknown text fields lose markup characters', () => {
  const s = JSON.parse('{"v":2,"anchor":{"balance":1},"recs":[],"tx":[],"budget":{"cats":[]},"rules":{"__proto__":{"polluted":1},"shop":"Food"},"mystery":"<b onclick=\\"x\\">hi</b>"}');
  const out = sandbox.sanitizeState(s);
  assert.equal(({}).polluted, undefined); assert.equal(out.rules.polluted, undefined); assert.equal(out.rules.shop, 'Food');
  assert.ok(!/[<>"]/.test(out.mystery));
});

test('restore rolls back on failure and a locked backup cannot demand an abusive key-stretching count', () => {
  assert.match(html, /function applyIncoming\(fn\)/);
  assert.match(html, /iter < 100000 \|\| iter > 2000000/);
  assert.match(html, /function norm\(s\) \{ sanitizeState\(s\);/);
});

test('calendar text cannot carry raw line breaks or control characters into the .ics file', () => {
  const src = html.slice(html.indexOf('function icsText(x)'), html.indexOf('\n', html.indexOf('function icsText(x)')));
  const sb = {}; vm.createContext(sb); vm.runInContext(src, sb);
  const out = sb.icsText('Rent\r\nBEGIN:VALARM\rX\u0000;a,b');
  const B = String.fromCharCode(92); assert.ok(!/[\r\n\u0000]/.test(out)); assert.equal(out, ['Rent', 'nBEGIN:VALARM', 'nX', ';a', ',b'].join(B));
});

test('follow-ups: saved password is cleared, voice code is gone, CI actions are pinned to commits', () => {
  assert.match(html, /if \(locked\) \{ var pwf = \$\('#bkPass'\); if \(pwf\) \{ pwf\.value = '';/);
  assert.ok(!html.includes('SpeechRecognition'));
  const wf = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'financial-insights-tests.yml'), 'utf8');
  for (const m of wf.matchAll(/uses: (\S+)/g)) assert.match(m[1], /@[0-9a-f]{40}$/, m[1]);
});
