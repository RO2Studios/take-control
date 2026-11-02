'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {createHash} = require('node:crypto');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
// Execute the actual production renderers, rather than duplicating their mapping.
const start = html.indexOf('  function moneyLevelBadge(');
const end = html.indexOf('  function renderMoneyLevel()', start);
const c = {esc: s => s};
vm.createContext(c);
vm.runInContext(fs.readFileSync(path.join(root, 'money-levels.js'), 'utf8'), c);
vm.runInContext(html.slice(start, end), c);
const expected = ['starter','builder','momentum','master'];
for (let i = 0; i < 4; i++) {
 for (const [status, index] of [['done', i+1], ['current', i], ['future', i-1]]) {
  test(`Level ${i+1} keeps its level artwork and colors when ${status}`, () => {
   // Boundary states (-1 and 4) deliberately exercise all 12 renderer combinations.
   const rendered = c.levelJourneyHTML({index});
   const stages = rendered.match(/<div role="listitem"[\s\S]*?<\/div>/g);
   assert.equal(stages.length, 4);
   const stage = stages[i];
   const kind = expected[i];
   assert.ok(stage.includes(`class="ml-stage ${status}"`));
   assert.ok(stage.includes(`ml-badge-${kind}"`));
   const img = stage.match(/<img[^>]+>/)[0];
   assert.equal(img, c.moneyLevelBadge(c.TakeControlLevels.levels[i].icon));
   const asset = img.match(/src="([^"]+)"/)[1];
   assert.equal(asset, `icons/money-${kind}-glossy.webp`);
   assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,asset))).digest('hex'), artworkHashes[i]);
   assert.ok(stage.includes(`${c.TakeControlLevels.levels[i].name}, ${{done:'completed',current:'current',future:'upcoming'}[status]}`));
  });
 }
}
// Frozen fingerprints of the approved glossy image files, independent of renderer selection.
const artworkHashes = [
  "ce6b8126bd85009cc3b0fec375fc0cda1fca3d4751e2b591f6b24fd79e223b90",
  "ca2ee0fb7368f9cdf750037b9f9d79641799ef85048785c7ec4be7a05e883947",
  "48009668ee3d1346628f4feee3ecb7a5f7f941e6f8c5bff9d971d0869a5f37d6",
  "adce687590423ac05ecce3849ee8b81c68d0e386dfb6fbb8f646e637d9eadfd5"
];
