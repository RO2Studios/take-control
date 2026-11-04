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
 browser = await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{channel:'chromium'})});
});
after(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));});
for (const width of [320,375,390,768,1440]) {
 test(`actual Today UI: stable icons, layout and saved data at ${width}px`, async () => {
  const context = await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'});
  const page = await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  await page.locator('[data-act="startExample"]').click();
  const sample = await page.evaluate(()=>JSON.parse(localStorage.getItem('moneyAhead.v2')));
  assert.equal(await page.locator('#moneyLevelRoot .ml-label strong').innerText(),'Level 3 · Money Strategist');
  assert.equal(await page.locator('#moneyLevelRoot .ml-pct').innerText(),'62% complete');
  assert.equal(await page.locator('#moneyLevelRoot .ml-bar-label').first().innerText(),'Journey to Money Master · 62%');
  if(process.env.MONEY_JOURNEY_SCREENSHOTS){
   await page.locator('#moneyLevelDetails').evaluate(el=>el.open=true);
   fs.mkdirSync(process.env.MONEY_JOURNEY_SCREENSHOTS,{recursive:true});
   await page.locator('#moneyLevelRoot').screenshot({path:path.join(process.env.MONEY_JOURNEY_SCREENSHOTS,`journey-demo-${width}.png`)});
  }
  for (const [index,xp] of [50,136,170,290].entries()) {
   const fixture = {...sample,sample:false,tx:[],recs:[],learned:{},reviews:[],goals:{asked:true,picks:[],ef:null},moneyXPHigh:xp,moneyLevelSeen:index+1};
   await page.evaluate(s=>{localStorage.setItem('moneyAhead.v2',JSON.stringify(s));localStorage.setItem('moneyAhead.levelExpanded','1');},fixture);
   await page.reload();
   const card=page.locator('#moneyLevelRoot');
   await card.waitFor({state:'visible'});
   assert.equal(await page.locator('#moneyLevelDetails').getAttribute('open'),'');
   assert.ok(Math.abs((await card.locator('.ml-journey').evaluate(el=>parseFloat(el.style.getPropertyValue('--ml-journey-progress'))))-index/3*100)<0.01,'connector matches the current earned level');
   const before = await page.evaluate(()=>localStorage.getItem('moneyAhead.v2'));
   const overall=Math.min(100,Math.floor(xp/290*100));
   assert.equal(await card.locator('.ml-pct').innerText(),overall+'% complete');
   assert.equal(await card.locator('.ml-bar-label').first().innerText(),'Journey to Money Master · '+overall+'%');
   assert.equal(await card.locator('.ml-fill').evaluate(el=>parseFloat(el.style.width)),overall);
   assert.equal(await card.locator('.ml-pct').evaluate(el=>getComputedStyle(el).color),'rgb(120, 86, 17)');
   assert.ok((await card.locator('.ml-fill').evaluate(el=>getComputedStyle(el).backgroundImage)).includes('rgb(21, 149, 46)'));
   const stages=card.locator('.ml-stage');
   assert.equal(await stages.count(),4);
   for(const [i,kind] of ['rookie','builder','strategist','master'].entries()) {
    const stage=stages.nth(i);
    assert.equal((await stage.locator('b').innerText()).replace(/\s+/g,' '),['Money Rookie','Money Builder','Money Strategist','Money Master'][i]);
    assert.equal(await stage.locator(`img.ml-badge-${kind}`).count(),1);
    assert.equal(await stage.locator('img').count(),1);
    assert.ok((await stage.getAttribute('class')).includes(i<index?'done':i===index?'current':'future'));
    await stage.locator('img').evaluate(img=>img.decode());
    assert.ok(await stage.locator('img').evaluate(img=>img.complete && img.naturalWidth===512),'approved image decoded');
    const badge=await stage.locator('img').boundingBox();
    const firstBadge=await stages.first().locator('img').boundingBox();
    assert.ok(Math.abs(badge.y-firstBadge.y)<1 && Math.abs(badge.height-firstBadge.height)<1,'all four badges share size and vertical alignment');
    const cell=await stage.boundingBox();
    const label=await stage.locator('b').boundingBox();
    assert.ok(label.x>=cell.x-1 && label.x+label.width<=cell.x+cell.width+1,'larger level names fit their stage');
    assert.equal(Math.round(badge.width),width<360?56:width<=420?64:width<900?72:88);
    assert.ok(badge.x>=cell.x-1 && badge.x+badge.width<=cell.x+cell.width+1,'badge fits its stage');
   }
   if(width>=900){
    const cardBox=await card.boundingBox(),navBox=await page.locator('#tabs').boundingBox();
    assert.ok(Math.abs(cardBox.x-navBox.x)<1 && Math.abs(cardBox.width-navBox.width)<1,'desktop card spans the content width');
   }
   const connector=await card.locator('.ml-journey').evaluate(el=>{const s=getComputedStyle(el,'::before');return parseFloat(s.top)+parseFloat(s.height)/2;});
   const iconBox=await stages.first().locator('img').boundingBox(),journeyBox=await card.locator('.ml-journey').boundingBox();
   assert.ok(Math.abs(connector-(iconBox.y+iconBox.height/2-journeyBox.y))<1,'connector remains centered through enlarged badges');
   assert.equal(await card.locator(`.ml-current-icon .ml-badge-${['rookie','builder','strategist','master'][index]}`).count(),1);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow');
   const todayText=await page.locator('#todayGrid').innerText();
   await page.locator('#moneyLevelDetails > summary').click();
   assert.equal(await page.locator('#moneyLevelDetails').getAttribute('open'),null);
   await page.waitForFunction(()=>localStorage.getItem('moneyAhead.levelExpanded')==='0');
   assert.equal(await page.locator('#todayGrid').innerText(),todayText);
   await page.reload();
   assert.equal(await page.locator('#moneyLevelDetails').getAttribute('open'),null);
   assert.equal(await page.evaluate(()=>localStorage.getItem('moneyAhead.v2')),before,'view toggles/reloads preserve budget data');
   await page.locator('#moneyLevelDetails > summary').click();
   if((index===1 || index===2) && process.env.MONEY_JOURNEY_SCREENSHOTS) {
    const out=process.env.MONEY_JOURNEY_SCREENSHOTS;fs.mkdirSync(out,{recursive:true});
    await card.screenshot({path:path.join(out,`journey-level${index+1}-${width}.png`)});
    await page.screenshot({path:path.join(out,`today-level${index+1}-${width}.png`),fullPage:true});
   }
  }
  assert.deepEqual(errors,[]);
  await context.close();
 });
}

test('approved cartoon badges are available after an offline reload', async()=>{
 const context=await browser.newContext({viewport:{width:390,height:1000}});
 const page=await context.newPage();
 await page.goto(url);
 await page.locator('[data-act="startExample"]').click();
 // Production auto-registers on HTTPS; explicitly register on this localhost test server.
 await page.evaluate(async()=>{await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;localStorage.setItem('moneyAhead.levelExpanded','1');});
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const assets=['rookie','builder','strategist','master'].map(k=>'icons/money-'+k+'-cartoon.webp');
 for(const asset of assets)assert.ok(await page.evaluate(async asset=>!!await (await caches.open('takecontrol-v56')).match(asset),asset));
 await context.setOffline(true);
 await page.reload();
 const images=page.locator('#moneyLevelRoot .ml-stage img');
 assert.equal(await images.count(),4);
 for(let i=0;i<4;i++){
  const img=images.nth(i);await img.evaluate(img=>img.decode());
  assert.equal(await img.getAttribute('src'),assets[i]);
  assert.equal(await img.evaluate(img=>img.naturalWidth),512);
 }
 await context.close();
});
