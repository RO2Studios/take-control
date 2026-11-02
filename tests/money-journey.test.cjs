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
const expected = [
 ['check', '#4cdc57', '#07833d'],
 ['chart', '#22c7a4', '#057b67'],
 ['rocket', '#4c9aff', '#2054de'],
 ['trophy', '#ffe46a', '#db9814']
];
for (let i = 0; i < 4; i++) {
 for (const [status, index] of [['done', i+1], ['current', i], ['future', i-1]]) {
  test(`Level ${i+1} keeps its level artwork and colors when ${status}`, () => {
   // Boundary states (-1 and 4) deliberately exercise all 12 renderer combinations.
   const rendered = c.levelJourneyHTML({index});
   const stages = rendered.match(/<div role="listitem"[\s\S]*?<\/div>/g);
   assert.equal(stages.length, 4);
   const stage = stages[i];
   const [kind, light, dark] = expected[i];
   assert.ok(stage.includes(`class="ml-stage ${status}"`));
   assert.ok(stage.includes(`ml-vector-${kind}"`));
   assert.ok(stage.includes(`stop-color="${light}"`));
   assert.ok(stage.includes(`stop-color="${dark}"`));
   const svg = stage.match(/<svg[\s\S]*?<\/svg>/)[0];
   assert.equal(svg, c.moneyLevelBadge(c.TakeControlLevels.levels[i].icon));
   assert.equal(createHash('sha256').update(svg).digest('hex'), artworkHashes[i]);
   assert.ok(stage.includes(`${c.TakeControlLevels.levels[i].name}, ${{done:'completed',current:'current',future:'upcoming'}[status]}`));
  });
 }
}
// Frozen fingerprints of the reviewed vector artwork, independent of renderer selection.
const artworkHashes = [
  "99405c344caa40c5984e0598c54b1ffb6ee8ac9bc8fed90a7e1555133db1b369",
  "2b3eebd81645a72e1afd06bbeda7d45e86d25f152d00abb02aeada1c9de20bdc",
  "02a994bf89830d5216805d170efa6737b2cd729fb6bddf746bffd065704cd589",
  "5047cdfddc5dfcb3ccdb435c8a4e102257737dfbf0b88bbcca0541fa56fd234a"
];
