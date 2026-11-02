'use strict';
const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const root = path.join(__dirname, '..');
let server, browser, url;
before(async () => {
 server = http.createServer((req,res) => {
  const pathname = new URL(req.url,'http://localhost').pathname;
  const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
  const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'};
  fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(err?'Not found':data);});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 url = `http://127.0.0.1:${server.address().port}/`;
 browser = await chromium.launch({headless:true,channel:'chromium'});
});
after(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
for (const width of [375,390,1440]) {
 test(`actual Today UI: stable icons, layout and saved data at ${width}px`, async () => {
  const context = await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'});
  const page = await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await page.locator('[data-act="startExample"]').click();
  const sample = await page.evaluate(()=>JSON.parse(localStorage.getItem('moneyAhead.v2')));
  for (const [index,xp] of [50,80,170,290].entries()) {
   const fixture = {...sample,sample:false,tx:[],recs:[],learned:{},reviews:[],goals:{asked:true,picks:[],ef:null},moneyXPHigh:xp,moneyLevelSeen:index+1};
   await page.evaluate(s=>{localStorage.setItem('moneyAhead.v2',JSON.stringify(s));localStorage.setItem('moneyAhead.levelExpanded','1');},fixture);
   await page.reload();
   const card=page.locator('#moneyLevelRoot');
   await card.waitFor({state:'visible'});
   assert.equal(await page.locator('#moneyLevelDetails').getAttribute('open'),'');
   const before = await page.evaluate(()=>localStorage.getItem('moneyAhead.v2'));
   const stages=card.locator('.ml-stage');
   assert.equal(await stages.count(),4);
   for(const [i,kind] of ['check','chart','rocket','trophy'].entries()) {
    const stage=stages.nth(i);
    assert.equal(await stage.locator(`svg.ml-vector-${kind}`).count(),1);
    assert.equal(await stage.locator('svg').count(),1);
    assert.ok((await stage.getAttribute('class')).includes(i<index?'done':i===index?'current':'future'));
    const badge=await stage.locator('svg').boundingBox();
    const cell=await stage.boundingBox();
    assert.ok(badge.width >= 50 && badge.width <= 60);
    assert.ok(badge.x>=cell.x-1 && badge.x+badge.width<=cell.x+cell.width+1,'badge fits its stage');
   }
   assert.equal(await card.locator(`.ml-current-icon .ml-vector-${['check','chart','rocket','trophy'][index]}`).count(),1);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow');
   const todayText=await page.locator('#todayGrid').innerText();
   await page.locator('#moneyLevelDetails > summary').click();
   assert.equal(await page.locator('#moneyLevelDetails').getAttribute('open'),null);
   assert.equal(await page.evaluate(()=>localStorage.getItem('moneyAhead.levelExpanded')),'0');
   assert.equal(await page.locator('#todayGrid').innerText(),todayText);
   await page.reload();
   assert.equal(await page.locator('#moneyLevelDetails').getAttribute('open'),null);
   assert.equal(await page.evaluate(()=>localStorage.getItem('moneyAhead.v2')),before,'view toggles/reloads preserve budget data');
   await page.locator('#moneyLevelDetails > summary').click();
   if(index===2 && process.env.MONEY_JOURNEY_SCREENSHOTS) {
    const out=process.env.MONEY_JOURNEY_SCREENSHOTS;fs.mkdirSync(out,{recursive:true});
    await card.screenshot({path:path.join(out,`journey-${width}.png`)});
    await page.screenshot({path:path.join(out,`today-${width}.png`),fullPage:true});
   }
  }
  assert.deepEqual(errors,[]);
  await context.close();
 });
}
