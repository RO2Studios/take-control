const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Pull the encryption helpers straight out of index.html so the test covers the shipped code.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function fn(name) { const start = html.indexOf('  function ' + name + '('); const end = html.indexOf('\n  function ', start + 10); return html.slice(start, end); }
const sandbox = { crypto: globalThis.crypto, TextEncoder, TextDecoder, btoa, atob, console };
vm.createContext(sandbox);
vm.runInContext('var BK_ITER = 600000; function toISO(){ return "2026-11-05"; } function todayNum(){ return 0; }', sandbox);
for (const n of ['b64', 'unb64', 'bkKey', 'encryptBackup', 'isEncryptedBackup', 'decryptBackup']) vm.runInContext(fn(n), sandbox);

test('backup encrypts to AES-256-GCM with a fresh salt and IV and round-trips with the password', async () => {
  const plain = JSON.stringify({ v: 2, tx: [{ amt: 1234 }], names: ['Jordan'] });
  const out = await sandbox.encryptBackup(plain, 'family2026');
  const obj = JSON.parse(out);
  assert.equal(obj.app, 'take-control'); assert.equal(obj.enc, 1); assert.equal(obj.cipher, 'AES-256-GCM'); assert.equal(obj.iter, 600000);
  assert.ok(sandbox.isEncryptedBackup(obj));
  assert.ok(!out.includes('Jordan') && !out.includes('1234'), 'ciphertext leaks nothing');
  assert.equal(await sandbox.decryptBackup(obj, 'family2026'), plain);
  const again = JSON.parse(await sandbox.encryptBackup(plain, 'family2026'));
  assert.notEqual(again.salt, obj.salt); assert.notEqual(again.iv, obj.iv);
});

test('wrong password and tampered ciphertext are rejected; plaintext backups are not mistaken for locked ones', async () => {
  const obj = JSON.parse(await sandbox.encryptBackup('{"v":2}', 'right'));
  await assert.rejects(sandbox.decryptBackup(obj, 'wrong'));
  const tampered = Object.assign({}, obj, { data: obj.data.slice(0, -4) + 'AAAA' });
  await assert.rejects(sandbox.decryptBackup(tampered, 'right'));
  assert.equal(sandbox.isEncryptedBackup({ v: 2, tx: [] }), false);
});

test('restore UI offers an unlock field on both restore entry points', () => {
  assert.equal((html.match(/id="bkRestoreWrap"/g) || []).length, 2);
  assert.ok(html.includes('data-act="bkUnlock"'));
});

test('stored reconcile summary is data, not markup, and the page ships a Content-Security-Policy', () => {
  assert.ok(!html.includes('last.body'), 'no stored HTML string is rendered');
  assert.ok(html.includes("delete s.lastImport.body"), 'legacy stored HTML is stripped on load');
  assert.match(html, /http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'/);
  assert.ok(/img-src 'self' data: blob:/.test(html) && /connect-src 'self'/.test(html) && /object-src 'none'/.test(html));
});
